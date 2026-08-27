import * as path from 'node:path';
import {
  findInteractiveAuthMethod,
  needsInteractiveLogin,
  selectEagerAuthMethod,
} from './authMethods';
import { GrokAgent } from './agent';
import {
  addActiveFile,
  addSelection,
  attachFromUi,
  attachPath,
  pasteClipboard,
  removeAttachment,
} from './attachments';
import { installHint, resolveGrokBinary } from './cli';
import { ContextMeter } from './contextMeter';
import { EditJournal } from './editJournal';
import { applyDiffStats, publicEdits } from './edits';
import { handleIncoming, parsePermissionOptions } from './incoming';
import { tr, uiLocale } from './locale';
import { logError, logInfo, logWarn, showLog } from './logger';
import { buildPromptBlocks } from './prompt';
import { RpcError } from './rpc';
import { normalizeSetting, readGrokSettings, writeGrokSetting } from './settings';
import {
  applySessionUpdate,
  finalizeReplayTimes,
  mergeCommands,
  modelsFromResult,
} from './sessionUpdates';
import { FALLBACK_COMMANDS, classifySlash, modeLabel, type HostAction } from './slash';
import { bindPlatform, plat, type Platform } from './platform';
import {
  deleteRule as removeRuleFile,
  importRuleFiles,
  listRules,
  toggleRule as toggleRuleFile,
} from './rulesHost';
import {
  deleteSkill as removeSkillDir,
  importSkillFolders,
  importSkillZips,
  listSkills,
  toggleSkill as toggleSkillDir,
} from './skillsHost';
import { runSlashAction, type SlashRuntime } from './slashHost';
import type {
  AccountInfo,
  Attachment,
  ChatMessage,
  ChatState,
  ChatStatus,
  DrawerId,
  GrokSettings,
  PermissionPrompt,
  RuleItem,
  SessionRow,
  SkillItem,
  SessionUpdate,
  SettingsPage,
  SlashCommandInfo,
} from './types';

interface PendingPermission {
  resolve: (value: unknown) => void;
}

export class GrokController implements SlashRuntime {
  agent?: GrokAgent;
  status: ChatStatus = 'connecting';
  messages: ChatMessage[] = [];
  attachments: Attachment[] = [];
  queue: string[] = [];
  compactMode = false;
  timestamps = false;
  multiline = false;
  settingsOpen = false;
  settingsPage: SettingsPage = 'main';
  rules: RuleItem[] = [];
  skills: SkillItem[] = [];
  history?: string[];
  drawer?: DrawerId;
  drawerTab?: string;
  drawerBody?: string;
  fileHits?: Array<{ path: string; label: string }>;
  private error?: string;
  private account?: AccountInfo;
  private loginView?: ChatState['login'];
  private models?: ChatState['models'];
  private permission?: PermissionPrompt;
  private cliPath?: string;
  private agentVersion?: string;
  private modeId = 'default';
  private commands: SlashCommandInfo[] = FALLBACK_COMMANDS;
  private sessions?: SessionRow[];
  private currentSessionId?: string;
  private restoringSession = false;
  private replaying = false;
  private authSeq = 0;
  private turn = 0;
  private starting?: Promise<void>;
  private wantAgent = false;
  private readonly pendingPermissions = new Map<string, PendingPermission>();
  private readonly listeners = new Set<(state: ChatState) => void>();
  private readonly streamListeners = new Set<(tail: import('./types').StreamTail) => void>();
  private emitTimer?: ReturnType<typeof setTimeout>;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private searchSeq = 0;
  private readonly disposables: Array<{ dispose(): void }> = [];
  readonly journal: EditJournal;
  readonly meter: ContextMeter;

  constructor(host?: Platform) {
    if (host) {
      bindPlatform(host);
    }
    this.compactMode = Boolean(plat().getState('ui.compactMode', false));
    this.timestamps = plat().getState('ui.timestamps', true);
    this.multiline = Boolean(plat().getState('ui.multiline', false));
    this.journal = new EditJournal({
      messages: () => this.messages,
      replaying: () => this.replaying,
      cwd: () => this.cwd(),
      displayPath: (filePath) => this.displayPath(filePath),
      emit: () => this.emit(),
    });
    this.meter = new ContextMeter({
      replaying: () => this.replaying,
      fetchInfo: async () => this.agent?.sessionInfo() ?? {},
      emit: () => this.emit(),
    });
    this.disposables.push(
      plat().onTrustChange(() => {
        if (this.wantAgent) {
          void this.start();
        }
      }),
      plat().onConfigChange(() => {
        this.emit();
      }),
    );
  }

  dispose(): void {
    this.flushEmitTimer();
    this.agent?.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }

  onDidChange(listener: (state: ChatState) => void): { dispose(): void } {
    this.listeners.add(listener);
    listener(this.snapshot());
    return { dispose: () => this.listeners.delete(listener) };
  }

  onDidStream(listener: (tail: import('./types').StreamTail) => void): { dispose(): void } {
    this.streamListeners.add(listener);
    return { dispose: () => this.streamListeners.delete(listener) };
  }

  snapshot(): ChatState {
    const settings = readGrokSettings();
    return {
      status: this.status,
      error: this.error,
      cliPath: this.cliPath,
      cliInstallHint: installHint(process.platform),
      account: this.account,
      login: this.loginView,
      models: this.models,
      modeId: this.modeId,
      messages: this.messages.map((message) =>
        message.edits?.length
          ? { ...message, edits: publicEdits(message.edits) }
          : message,
      ),
      permission: this.permission,
      attachments: this.attachments,
      agentVersion: this.agentVersion,
      commands: this.commands,
      sessions: this.sessions,
      history: this.history,
      drawer: this.drawer,
      drawerTab: this.drawerTab,
      drawerBody: this.drawerBody,
      fileHits: this.fileHits,
      compactMode: this.compactMode,
      timestamps: this.timestamps,
      multiline: this.multiline,
      queue: this.queue,
      currentSessionId: this.currentSessionId,
      restoringSession: this.restoringSession,
      alwaysApprove: settings.alwaysApprove,
      locale: uiLocale(),
      context: this.meter.usage,
      settings,
      settingsOpen: this.settingsOpen,
      settingsPage: this.settingsPage,
      rules: this.rules,
      skills: this.skills,
    };
  }

  async start(): Promise<void> {
    this.wantAgent = true;
    if (this.starting) {
      return this.starting;
    }
    this.starting = this.startInner().finally(() => {
      this.starting = undefined;
    });
    return this.starting;
  }

  private async ensureAgent(): Promise<void> {
    if (this.agent) {
      return;
    }
    await this.start();
  }

  async restart(): Promise<void> {
    this.agent?.dispose();
    this.agent = undefined;
    this.messages = [];
    this.journal.clear();
    this.permission = undefined;
    await this.start();
  }

  async newSession(): Promise<void> {
    if (!this.agent) {
      await this.start();
    }
    const agent = this.agent;
    if (!agent) {
      return;
    }
    this.messages = [];
    this.journal.clear();
    this.permission = undefined;
    try {
      await this.createSession(agent);
      this.currentSessionId = agent.sessionId;
      this.setStatus('ready');
      void this.refreshSessionsSilent();
    } catch (error) {
      this.fail('Could not create a session', error);
    }
  }

  async login(): Promise<void> {
    if (!this.agent) {
      await this.start();
    }
    const agent = this.agent;
    if (!agent) {
      return;
    }
    const methods = agent.authMethods();
    const interactive = findInteractiveAuthMethod(methods);
    if (!interactive) {
      this.fail('No browser login method is available. Set an API key instead.');
      return;
    }
    const requestSeq = ++this.authSeq;
    this.loginView = { label: interactive.name };
    this.setStatus('authenticating');
    const authPromise = agent.authenticate(interactive.id, {
      use_oauth: true,
      request_seq: requestSeq,
      force_interactive: true,
    });
    void this.openAuthUrl(agent);
    try {
      await authPromise;
      this.account = await agent.authInfo().catch(() => undefined);
      await this.createSession(agent);
      this.loginView = undefined;
      this.setStatus('ready');
      void this.refreshSessionsSilent();
      plat().info('Signed in to Grok Build.');
    } catch (error) {
      if (this.status === 'authenticating') {
        this.loginView = { ...this.loginView, label: interactive.name };
        this.fail('Sign-in did not complete', error);
        this.status = 'login';
        this.emit();
      }
    }
  }

  async cancelLogin(): Promise<void> {
    try {
      await this.agent?.cancelAuth(this.authSeq);
    } catch (error) {
      logWarn(`cancel auth: ${error instanceof Error ? error.message : error}`);
    }
    this.status = 'login';
    this.error = undefined;
    this.emit();
  }

  async submitAuthCode(code: string): Promise<void> {
    try {
      await this.agent?.submitAuthCode(code.trim());
    } catch (error) {
      this.fail('Could not submit the login code', error);
    }
  }

  async openLoginUrl(): Promise<void> {
    const url = this.loginView?.url;
    if (url) {
      await plat().openExternal(url);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.agent?.logout();
    } catch (error) {
      logError('logout failed', error);
    }
    this.account = undefined;
    this.messages = [];
    this.journal.clear();
    this.status = 'login';
    this.emit();
  }

  async setApiKey(key?: string): Promise<void> {
    const value =
      key ??
      (await plat().input('xAI API key', {
        prompt: 'Paste an API key from console.x.ai',
        password: true,
      }));
    if (!value) {
      return;
    }
    if (!this.agent) {
      await this.start();
    }
    const agent = this.agent;
    if (!agent) {
      return;
    }
    try {
      await agent.setApiKey(value.trim());
      await agent.authenticate('xai.api_key');
      this.account = await agent.authInfo().catch(() => ({ methodId: 'xai.api_key' }));
      await this.createSession(agent);
      this.status = 'ready';
      this.error = undefined;
      this.emit();
    } catch (error) {
      this.fail('API key sign-in failed', error);
    }
  }

  async send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed && this.attachments.length === 0) {
      return;
    }
    await this.ensureAgent();
    const action = classifySlash(trimmed);
    if (action.kind !== 'pass') {
      await this.runHostAction(action);
      return;
    }
    const agent = this.agent;
    if (!agent || (this.status !== 'ready' && this.status !== 'streaming')) {
      return;
    }
    if (!agent.sessionId) {
      try {
        await this.createSession(agent);
        this.currentSessionId = agent.sessionId;
      } catch (error) {
        this.fail('Could not create a session', error);
        return;
      }
    }
    if (this.status === 'streaming') {
      this.queue = [...this.queue, trimmed];
      this.emit();
      try {
        await agent.interject(trimmed);
      } catch {
        /* queued locally; flushed after the current turn */
      }
      return;
    }
    const blocks = await buildPromptBlocks(trimmed, this.attachments);
    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: `user-${++this.turn}`,
      role: 'user',
      text: trimmed || this.attachments.map((item) => item.label).join(', '),
      tools: [],
      createdAt: now,
      images: this.attachments
        .filter((item) => item.data && item.mimeType?.startsWith('image/'))
        .map((item) => ({
          mimeType: item.mimeType ?? 'image/png',
          data: item.data,
        })),
    };
    const assistant: ChatMessage = {
      id: `assistant-${this.turn}`,
      role: 'assistant',
      text: '',
      thinking: '',
      tools: [],
      streaming: true,
      createdAt: now,
    };
    this.messages = [...this.messages, userMessage, assistant];
    this.attachments = [];
    this.setStatus('streaming');
    try {
      await agent.prompt(blocks);
    } catch (error) {
      if (error instanceof RpcError && /cancel/i.test(error.message)) {
        this.finishAssistant();
        this.setStatus('ready');
        return;
      }
      this.finishAssistant();
      this.fail('The agent could not complete that turn', error);
      return;
    }
    this.finishAssistant();
    this.setStatus('ready');
    await this.flushQueue();
  }

  cancelTurn(): void {
    this.agent?.cancelTurn();
  }

  choosePermission(optionId: string): void {
    const current = this.permission;
    if (!current) {
      return;
    }
    const pending = this.pendingPermissions.get(current.requestId);
    pending?.resolve({
      outcome: { outcome: 'selected', optionId },
    });
    this.pendingPermissions.delete(current.requestId);
    this.permission = undefined;
    this.emit();
  }

  cancelPermission(): void {
    const current = this.permission;
    if (!current) {
      return;
    }
    const pending = this.pendingPermissions.get(current.requestId);
    pending?.resolve({ outcome: { outcome: 'cancelled' } });
    this.pendingPermissions.delete(current.requestId);
    this.permission = undefined;
    this.emit();
  }

  addSelection(): void {
    addSelection(this);
  }

  addActiveFile(): void {
    addActiveFile(this);
  }

  removeAttachment(id: string): void {
    removeAttachment(this, id);
  }

  async attachFromUi(): Promise<void> {
    await attachFromUi(this);
  }

  async pasteClipboard(payload: {
    text?: string;
    uris?: string[];
    images?: Array<{ name: string; mimeType: string; data: string }>;
  }): Promise<void> {
    await pasteClipboard(this, payload);
  }

  pickFile(filePath: string): void {
    void attachPath(this, filePath);
  }

  async setEffort(level: string): Promise<void> {
    if (this.busyTurn()) {
      return;
    }
    if (this.models?.currentId) {
      try {
        await this.agent?.setModel(this.models.currentId, {
          reasoningEffort: level,
        });
        this.patchCurrentEffort(level);
        return;
      } catch (error) {
        logWarn(`set effort via model meta failed: ${error}`);
      }
    }
    await this.sendAgentSlash(`/effort ${level}`);
    this.patchCurrentEffort(level);
  }

  async setModel(modelId: string): Promise<void> {
    if (this.busyTurn()) {
      return;
    }
    try {
      await this.agent?.setModel(modelId);
      if (this.models) {
        this.models = { ...this.models, currentId: modelId };
        this.emit();
      }
    } catch (error) {
      this.fail('Could not switch models', error);
    }
  }

  async installCli(): Promise<void> {
    plat().createTerminal('Install Grok CLI', installHint(plat().os()));
  }

  showLog(): void {
    showLog();
  }

  async cycleMode(): Promise<void> {
    if (this.busyTurn()) {
      plat().info(tr('busyLock'));
      return;
    }
    const order = ['ask', 'plan', 'default'];
    const i = order.indexOf(this.modeId);
    const next = order[(i + 1) % order.length];
    await this.setMode(next);
  }

  async setMode(modeId: string): Promise<void> {
    if (this.busyTurn()) {
      return;
    }
    try {
      await this.agent?.setMode(modeId);
      this.modeId = modeId;
      this.note(`Mode: ${modeLabel(modeId)}`);
      this.emit();
    } catch (error) {
      this.fail('Could not change mode', error);
    }
  }

  async compact(note?: string): Promise<void> {
    try {
      await this.agent?.compact(note);
      this.note('Compacted conversation history.');
    } catch (error) {
      this.fail('Compact failed', error);
    }
  }

  async rewind(): Promise<void> {
    try {
      const points = await this.agent?.rewindPoints();
      if (!points?.length) {
        this.note('No rewind points in this session.');
        return;
      }
      const picked = await plat().pick(
        'Rewind to turn',
        points.map((point) => ({
          label: `#${point.index}`,
          description: point.preview?.slice(0, 80),
          value: point.index,
        })),
      );
      if (picked !== undefined) {
        await this.rewindTo(picked);
      }
    } catch (error) {
      this.fail('Rewind failed', error);
    }
  }

  async rewindTo(index: number): Promise<void> {
    await this.agent?.rewindTo(index);
    this.messages = this.messages.slice(0, Math.max(0, index * 2));
    this.note(`Rewound to turn ${index}.`);
  }

  async resumePicker(): Promise<void> {
    await this.refreshSessionsSilent();
    this.drawer = 'sessions';
    this.emit();
  }

  async refreshSessionsSilent(): Promise<void> {
    try {
      this.sessions = (await this.agent?.listRecentSessions(50)) ?? [];
      this.emit();
    } catch (error) {
      logWarn(`session list: ${error instanceof Error ? error.message : error}`);
    }
  }

  async loadSession(sessionId: string, sessionCwd?: string): Promise<void> {
    const agent = this.agent;
    if (!agent) {
      return;
    }
    const cwd =
      sessionCwd ??
      this.sessions?.find((row) => row.id === sessionId)?.cwd ??
      this.cwd();
    this.messages = [];
    this.journal.clear();
    this.permission = undefined;
    this.drawer = undefined;
    this.restoringSession = true;
    this.replaying = true;
    this.currentSessionId = sessionId;
    this.emit();
    try {
      const result = await agent.loadSession(sessionId, cwd);
      this.models = modelsFromResult(result) ?? this.models;
      this.currentSessionId = agent.sessionId ?? sessionId;
      finalizeReplayTimes(this.messages);
      this.setStatus('ready');
      void this.journal.hydrateFromGit().then(() => this.emit());
      void this.meter.refresh();
    } catch (error) {
      this.fail('Could not restore that session', error);
    } finally {
      this.replaying = false;
      this.restoringSession = false;
      this.emit();
    }
  }

  async exportChat(): Promise<void> {
    const md = this.messages
      .map((m) => `## ${m.role === 'user' ? 'You' : 'Grok'}\n\n${m.text}`)
      .join('\n\n');
    const filePath = await plat().saveFile(path.join(this.cwd(), 'grok-session.md'));
    if (!filePath) {
      return;
    }
    await plat().writeFile(filePath, Buffer.from(md, 'utf8'));
    this.note(`Exported to ${filePath}.`);
  }

  copyLast(n = 1): void {
    const replies = this.messages.filter((m) => m.role === 'assistant' && m.text);
    const msg = replies[replies.length - n];
    if (!msg) {
      return;
    }
    void plat().clipboardWrite(msg.text);
    this.note('Copied last reply.');
  }

  async searchFiles(query: string): Promise<void> {
    const seq = ++this.searchSeq;
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    await new Promise<void>((resolve) => {
      this.searchTimer = setTimeout(resolve, 180);
    });
    if (seq !== this.searchSeq) {
      return;
    }
    const hits = await plat().findFiles(query);
    if (seq !== this.searchSeq) {
      return;
    }
    this.fileHits = hits;
    this.emit();
  }

  async undoEdits(messageId?: string): Promise<void> {
    await this.journal.revert(messageId);
  }

  async reviewEdits(messageId?: string, onlyPath?: string): Promise<void> {
    const assistant = this.journal.assistant(messageId);
    const files = await this.journal.diffs(messageId, onlyPath);
    if (assistant && files.length > 0 && !onlyPath) {
      assistant.edits = applyDiffStats(assistant.edits ?? [], files);
      this.emit();
    }
    if (files.length === 0) {
      if (onlyPath) {
        await plat().openFile(onlyPath, true);
      }
      plat().info(
        tr(onlyPath ? 'reviewMissing' : 'reviewEmpty', {
          name: onlyPath ? path.basename(onlyPath) : '',
        }),
      );
      return;
    }
    plat().showDiff?.({
      locale: uiLocale(),
      files,
      messageId: assistant?.id,
      onRevert: () => {
        void this.journal.revert(assistant?.id).then(async (result) => {
          if (result === 'cancelled' || result === 'empty') {
            return;
          }
          const still = this.journal.assistant(assistant?.id)?.edits?.length;
          if (!still) {
            return;
          }
          await this.reviewEdits(assistant?.id);
        });
      },
    });
  }

  openEdit(filePath: string, messageId?: string): void {
    void this.reviewEdits(messageId, filePath);
  }

  closeDrawer(): void {
    this.drawer = undefined;
    this.drawerBody = undefined;
    this.emit();
  }

  openSettings(): void {
    this.drawer = undefined;
    this.settingsOpen = true;
    this.settingsPage = 'main';
    this.emit();
    void this.refreshRules();
    void this.refreshSkills();
  }

  closeSettings(): void {
    this.settingsOpen = false;
    this.settingsPage = 'main';
    this.emit();
  }

  openRules(): void {
    this.settingsOpen = true;
    this.settingsPage = 'rules';
    this.emit();
    void this.refreshRules();
  }

  closeRules(): void {
    this.settingsPage = 'main';
    this.emit();
  }

  async importRules(): Promise<void> {
    const picked = await plat().openFiles({
      title: tr('settingsRulesImport'),
      filters: { Markdown: ['md'], Text: ['txt'] },
    });
    if (!picked?.length) {
      return;
    }
    const n = await importRuleFiles(picked);
    await this.refreshRules();
    plat().info(tr('settingsRulesImported', { n }));
  }

  async toggleRule(id: string): Promise<void> {
    await toggleRuleFile(id);
    await this.refreshRules();
  }

  async deleteRule(id: string): Promise<void> {
    const row = this.rules.find((item) => item.id === id);
    const ok = await plat().confirm(
      tr('settingsRulesDeleteConfirm', { name: row?.name ?? id }),
      tr('settingsRulesDelete'),
    );
    if (!ok) {
      return;
    }
    await removeRuleFile(id);
    await this.refreshRules();
  }

  openRule(id: string): void {
    void plat().openFile(id, false);
  }

  private async refreshRules(): Promise<void> {
    try {
      this.rules = await listRules();
      this.emit();
    } catch (error) {
      logWarn(`rules list: ${error instanceof Error ? error.message : error}`);
    }
  }

  openSkills(): void {
    this.settingsOpen = true;
    this.settingsPage = 'skills';
    this.emit();
    void this.refreshSkills();
  }

  closeSkills(): void {
    this.settingsPage = 'main';
    this.emit();
  }

  async importSkillZip(): Promise<void> {
    const picked = await plat().openFiles({
      title: tr('settingsSkillsImportZip'),
      filters: { Zip: ['zip'] },
    });
    if (!picked?.length) {
      return;
    }
    const n = await importSkillZips(picked);
    await this.refreshSkills();
    plat().info(tr('settingsSkillsImported', { n }));
  }

  async importSkillFolder(): Promise<void> {
    const picked = await plat().openFolders({ title: tr('settingsSkillsImportFolder') });
    if (!picked?.length) {
      return;
    }
    const n = await importSkillFolders(picked);
    await this.refreshSkills();
    plat().info(tr('settingsSkillsImported', { n }));
  }

  async toggleSkill(id: string): Promise<void> {
    await toggleSkillDir(id);
    await this.refreshSkills();
  }

  async deleteSkill(id: string): Promise<void> {
    const row = this.skills.find((item) => item.id === id);
    const ok = await plat().confirm(
      tr('settingsSkillsDeleteConfirm', { name: row?.name ?? id }),
      tr('settingsSkillsDelete'),
    );
    if (!ok) {
      return;
    }
    await removeSkillDir(id);
    await this.refreshSkills();
  }

  openSkill(id: string): void {
    const row = this.skills.find((item) => item.id === id);
    void plat().openFile(row?.skillFile ?? id, false);
  }

  private async refreshSkills(): Promise<void> {
    try {
      this.skills = await listSkills();
      this.emit();
    } catch (error) {
      logWarn(`skills list: ${error instanceof Error ? error.message : error}`);
    }
  }

  async updateSetting(key: keyof GrokSettings, value: string | boolean): Promise<void> {
    const next = normalizeSetting(key, value);
    if (next === undefined) {
      return;
    }
    await writeGrokSetting(key, next);
    this.emit();
  }

  toggleUiFlag(flag: 'compactMode' | 'timestamps' | 'multiline'): void {
    this[flag] = !this[flag];
    void plat().setState(`ui.${flag}`, this[flag]);
    this.emit();
  }

  async sendAgentSlash(text: string): Promise<void> {
    const agent = this.agent;
    if (!agent || this.status === 'streaming') {
      return;
    }
    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: `user-${++this.turn}`,
      role: 'user',
      text,
      tools: [],
      createdAt: now,
    };
    const assistant: ChatMessage = {
      id: `assistant-${this.turn}`,
      role: 'assistant',
      text: '',
      thinking: '',
      tools: [],
      streaming: true,
      createdAt: now,
    };
    this.messages = [...this.messages, userMessage, assistant];
    this.setStatus('streaming');
    try {
      await agent.prompt([{ type: 'text', text }]);
    } catch (error) {
      this.finishAssistant();
      this.fail('Command failed', error);
      return;
    }
    this.finishAssistant();
    this.setStatus('ready');
  }

  resolveModelId(name: string): string | undefined {
    const q = name.toLowerCase();
    const hit = this.models?.available.find(
      (model) => model.id.toLowerCase() === q || model.name.toLowerCase().includes(q),
    );
    return hit?.id;
  }

  note(text: string): void {
    this.messages = [
      ...this.messages,
      {
        id: `note-${++this.turn}`,
        role: 'assistant',
        text,
        tools: [],
      },
    ];
    this.emit();
  }

  cwd(): string {
    return plat().cwd();
  }

  private busyTurn(): boolean {
    return this.status === 'streaming';
  }

  emit(): void {
    this.flushEmitTimer();
    const state = this.snapshot();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  applyIncomingUpdate(update: SessionUpdate, isReplay = false): void {
    const view = {
      replaying: this.replaying || isReplay,
      messages: this.messages,
      nextTurn: () => ++this.turn,
      modeId: this.modeId,
      models: this.models,
      commands: this.commands,
      meter: this.meter,
      rememberFile: (filePath: string) => this.journal.remember(filePath),
      capturePrevious: (filePath: string, previous: string) =>
        this.journal.capturePrevious(filePath, previous),
      displayPath: (filePath: string) => this.displayPath(filePath),
      emitUnlessReplaying: () => this.emitUnlessReplaying(),
      refreshEditStats: (assistant) => {
        void this.syncEditStats(assistant);
      },
    };
    applySessionUpdate(view, update);
    this.modeId = view.modeId;
    this.models = view.models;
    this.commands = view.commands;
  }

  async requestToolPermission(params: unknown): Promise<unknown> {
    const parsed = parsePermissionOptions(params);
    const mode = plat().getConfig('permissionMode', 'ask');
    if (mode === 'auto') {
      const allow =
        parsed.options.find((option) => option.kind === 'allow_once') ?? parsed.options[0];
      if (allow) {
        return { outcome: { outcome: 'selected', optionId: allow.optionId } };
      }
    }
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.permission = {
      requestId,
      title: parsed.title,
      details: parsed.details,
      options: parsed.options,
    };
    this.emit();
    return new Promise((resolve) => {
      this.pendingPermissions.set(requestId, { resolve });
    });
  }

  private async runHostAction(action: HostAction): Promise<void> {
    await runSlashAction(this, action);
  }

  private patchCurrentEffort(level: string): void {
    if (!this.models) {
      return;
    }
    this.models = {
      ...this.models,
      available: this.models.available.map((model) =>
        model.id === this.models?.currentId ? { ...model, currentEffort: level } : model,
      ),
    };
    this.emit();
  }

  private async flushQueue(): Promise<void> {
    const next = this.queue[0];
    if (!next) {
      return;
    }
    this.queue = this.queue.slice(1);
    this.emit();
    await this.send(next);
  }

  private async startInner(): Promise<void> {
    this.error = undefined;
    if (this.messages.length === 0) {
      this.setStatus('connecting');
    }
    if (!plat().isTrusted()) {
      this.setStatus('untrusted');
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
    const cliPath = resolveGrokBinary({
      configuredPath: plat().getConfig('cliPath', ''),
      preferWorkspaceBinary: plat().getConfig('preferWorkspaceBinary', false),
      workspaceFolders: plat().workspaceFolders(),
      homeDir: plat().homeDir(),
      pathEnv: plat().pathEnv(),
      platform: plat().os(),
    });
    if (!cliPath) {
      this.setStatus('missingCli');
      return;
    }
    this.cliPath = cliPath;
    try {
      const agent = GrokAgent.spawn(
        {
          cliPath,
          cwd: this.cwd(),
          alwaysApprove: plat().getConfig('alwaysApprove', false),
          extensionVersion: plat().extensionVersion(),
        },
        (method, params, id) => this.onIncoming(method, params, id),
      );
      this.agent = agent;
      const init = await agent.initialize();
      this.agentVersion = agent.agentVersion();
      this.models = modelsFromResult(init) ?? this.models;
      const methods = agent.authMethods();
      const defaultId = agent.defaultAuthMethodId();
      logInfo(
        `initialize methods=${methods.map((m) => m.id).join(',')} default=${defaultId ?? ''}`,
      );
      if (methods.length === 0 || needsInteractiveLogin(methods)) {
        const interactive = findInteractiveAuthMethod(methods);
        this.loginView = { label: interactive?.name ?? 'Grok' };
        this.setStatus('login');
        return;
      }
      const methodId = selectEagerAuthMethod(methods, defaultId);
      if (methodId) {
        await agent.authenticate(methodId);
      }
      this.account = await agent.authInfo().catch(() => undefined);
      this.commands = mergeCommands(agent.availableCommands(), FALLBACK_COMMANDS);
      void agent.commandsList().then((cmds) => {
        this.commands = mergeCommands(cmds, FALLBACK_COMMANDS);
        this.emit();
      });
      this.setStatus('ready');
    } catch (error) {
      this.fail('Could not start the Grok agent', error);
    }
  }

  private async onIncoming(
    method: string,
    params: unknown,
    id: number | string,
  ): Promise<unknown> {
    return handleIncoming(this, method, params, id);
  }

  private emitUnlessReplaying(): void {
    if (this.replaying) {
      return;
    }
    if (this.status === 'streaming') {
      this.emitSoon();
      return;
    }
    this.emit();
  }

  private emitSoon(): void {
    if (this.emitTimer) {
      return;
    }
    this.emitTimer = setTimeout(() => {
      this.emitTimer = undefined;
      this.emitTail();
    }, 80);
  }

  private flushEmitTimer(): void {
    if (!this.emitTimer) {
      return;
    }
    clearTimeout(this.emitTimer);
    this.emitTimer = undefined;
  }

  private emitTail(): void {
    const last = this.messages.at(-1);
    if (!last || last.role !== 'assistant' || !last.streaming || this.streamListeners.size === 0) {
      this.emit();
      return;
    }
    const tail: import('./types').StreamTail = {
      type: 'tail',
      message: last,
      status: this.status,
      context: this.meter.usage,
      queue: this.queue,
    };
    for (const listener of this.streamListeners) {
      listener(tail);
    }
  }

  private async openAuthUrl(agent: GrokAgent): Promise<void> {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && this.status === 'authenticating') {
      try {
        const info = await agent.getAuthUrl();
        if (info.url) {
          this.loginView = {
            ...this.loginView,
            url: info.url,
            mode: info.mode,
          };
          this.emit();
          await plat().openExternal(info.url);
          return;
        }
      } catch (error) {
        logWarn(`get_url: ${error instanceof Error ? error.message : error}`);
      }
      await sleep(80);
    }
  }

  private displayPath(filePath: string): string {
    return plat().relativePath(filePath);
  }

  private async syncEditStats(assistant: ChatMessage): Promise<void> {
    const files = await this.journal.diffs(assistant.id);
    if (!files.length || !this.messages.includes(assistant)) {
      return;
    }
    assistant.edits = applyDiffStats(assistant.edits ?? [], files);
    this.emitUnlessReplaying();
  }

  private async createSession(agent: GrokAgent): Promise<void> {
    const result = await agent.newSession(this.cwd());
    this.currentSessionId = agent.sessionId ?? result.sessionId;
    this.models = modelsFromResult(result) ?? this.models;
    void this.meter.refresh();
  }

  private finishAssistant(): void {
    const assistant = this.messages.filter((m) => m.role === 'assistant').at(-1);
    if (assistant) {
      assistant.streaming = false;
      assistant.endedAt = assistant.endedAt ?? new Date().toISOString();
      void this.syncEditStats(assistant);
    }
    void this.meter.refresh();
  }

  private setStatus(status: ChatStatus): void {
    this.status = status;
    if (status !== 'error') {
      this.error = undefined;
    }
    this.emit();
  }

  private fail(message: string, error?: unknown): void {
    const detail = error instanceof Error ? error.message : error ? String(error) : '';
    this.error = detail ? `${message}: ${detail}` : message;
    if (this.status === 'streaming' || this.status === 'ready') {
      this.status = 'ready';
    } else if (this.status !== 'login' && this.status !== 'authenticating') {
      this.status = 'error';
    }
    logError(message, error);
    this.emit();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
