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
import { handleIncoming } from './incoming';
import { tr, uiLocale } from './locale';
import { logError, logInfo, logWarn, showLog } from './logger';
import { buildPromptBlocks } from './prompt';
import { formatAgentError, formatErrorLine, isCancelError } from './errors';
import { readGrokSettings } from './settings';
import {
  applySessionUpdate,
  finalizeReplayTimes,
  mergeCommands,
  mergeModelCatalog,
  modelsFromResult,
} from './sessionUpdates';
import { FALLBACK_COMMANDS, classifySlash, modeLabel, promptModeMeta, type HostAction } from './slash';
import { bindPlatform, plat, type Platform } from './platform';

import { gitProbePaths } from './fork';
import { runSlashAction, type SlashRuntime } from './slashHost';
import {
  abortClientRpcs,
  answerAsk as answerAskRpc,
  askUserQuestion as askUserQuestionRpc,
  cancelAsk as cancelAskRpc,
  cancelPermission as cancelPermissionRpc,
  choosePermission as choosePermissionRpc,
  requestToolPermission as requestToolPermissionRpc,
  reviewPlan as reviewPlanRpc,
  type PendingAsk,
  type PendingPermission,
  type ReverseHost,
} from './reverseRpc';
import * as drawers from './settingsDrawers';
import type { SettingsHost } from './settingsDrawers';
import type {
  AccountInfo,
  AgentDefItem,
  Attachment,
  ChatMessage,
  ChatState,
  ChatStatus,
  DrawerId,
  AskCard,
  GrokSettings,
  PermissionPrompt,
  PersonaItem,
  RosterEntry,
  RuleItem,
  SessionRow,
  SkillItem,
  SessionUpdate,
  SettingsPage,
  SlashCommandInfo,
  SubagentLive,
  ApiEndpoint,
  McpItem,
  ThemeColors,
  WorktreeItem,
  PluginItem,
  HookItem,
  MarketplacePlugin,
  WorkflowItem,
  TaskItem,
  MemoryFile,
} from './types';
import { sessionPermissionMeta } from './permissions';
import { disposeAllTerminals } from './acpTerminal';
import { AGENT_RECONNECT_MAX, reconnectDelayMs } from './reconnect';
import { workspaceStartupHints } from './startup';
import { DEFAULT_THEME, normalizeTheme } from './theme';

export class GrokController implements SlashRuntime, SettingsHost, ReverseHost {
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
  apis: ApiEndpoint[] = [];
  mcps: McpItem[] = [];
  agents: AgentDefItem[] = [];
  personas: PersonaItem[] = [];
  roster: RosterEntry[] = [];
  subagents: SubagentLive[] = [];
  agentProfile?: string;
  worktrees: WorktreeItem[] = [];
  plugins: PluginItem[] = [];
  hooks: HookItem[] = [];
  marketplace: MarketplacePlugin[] = [];
  workflows: WorkflowItem[] = [];
  tasks: TaskItem[] = [];
  memoryFiles: MemoryFile[] = [];
  extTab: 'plugins' | 'marketplace' | 'hooks' | 'workflows' = 'plugins';
  theme: ThemeColors = DEFAULT_THEME;
  history?: string[];
  drawer?: DrawerId;
  drawerTab?: string;
  drawerBody?: string;
  fileHits?: Array<{ path: string; label: string }>;
  private error?: string;
  private account?: AccountInfo;
  private loginView?: ChatState['login'];
  models?: ChatState['models'];
  permission?: PermissionPrompt;
  ask?: AskCard;
  askPending?: PendingAsk;
  private cliPath?: string;
  private agentVersion?: string;
  modeId = 'default';
  private commands: SlashCommandInfo[] = FALLBACK_COMMANDS;
  sessions?: SessionRow[];
  currentSessionId?: string;
  private sessionCwd?: string;
  private restoringSession = false;
  private replaying = false;
  private authSeq = 0;
  turn = 0;
  private starting?: Promise<void>;
  private wantAgent = false;
  private reconnectFails = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  readonly pendingPermissions = new Map<string, PendingPermission>();
  private readonly listeners = new Set<(state: ChatState) => void>();
  private readonly streamListeners = new Set<(tail: import('./types').StreamTail) => void>();
  private emitTimer?: ReturnType<typeof setTimeout>;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private searchSeq = 0;
  modelsReloadSeq = 0;
  private pendingModelId?: string;
  private pendingEffort?: string;
  private runGen = 0;
  private agentGen = 0;
  private sessionOp = 0;
  private hideSessionPreview = false;
  dashSeq = 0;
  dashTimer?: ReturnType<typeof setTimeout>;
  taskSeq = 0;
  taskTimer?: ReturnType<typeof setTimeout>;
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
    this.theme = normalizeTheme(plat().getState('ui.theme', DEFAULT_THEME));
    const profile = plat().getState('ui.agentProfile', '');
    this.agentProfile = typeof profile === 'string' && profile.trim() ? profile.trim() : undefined;
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
    this.wantAgent = false;
    abortClientRpcs(this, 'cancel');
    this.flushEmitTimer();
    drawers.stopDashboardPoll(this);
    drawers.stopTaskPoll(this);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
    this.clearReconnectTimer();
    this.reconnectFails = 0;
    this.dropAgent();
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
      ask: this.ask,
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
      hideSessionPreview: this.hideSessionPreview,
      workspacePath: this.cwd(),
      alwaysApprove: settings.alwaysApprove,
      locale: uiLocale(),
      context: this.meter.usage,
      settings,
      settingsOpen: this.settingsOpen,
      settingsPage: this.settingsPage,
      rules: this.rules,
      skills: this.skills,
      apis: this.apis,
      mcps: this.mcps,
      agents: this.agents,
      personas: this.personas,
      roster: this.roster,
      subagents: this.subagents,
      agentProfile: this.agentProfile,
      worktrees: this.worktrees,
      plugins: this.plugins,
      hooks: this.hooks,
      marketplace: this.marketplace,
      workflows: this.workflows,
      tasks: this.tasks,
      memoryFiles: this.memoryFiles,
      extTab: this.extTab,
      theme: this.theme,
    };
  }

  async start(): Promise<void> {
    this.wantAgent = true;
    if (this.agent) {
      this.emit();
      return;
    }
    this.clearReconnectTimer();
    if (this.starting) {
      return this.starting;
    }
    this.reconnectFails = 0;
    return this.beginStart();
  }

  private beginStart(): Promise<void> {
    const run = this.startInner().finally(() => {
      if (this.starting === run) {
        this.starting = undefined;
      }
    });
    this.starting = run;
    return run;
  }

  private async ensureAgent(): Promise<void> {
    if (this.agent) {
      return;
    }
    await this.start();
  }

  async restart(): Promise<void> {
    this.wantAgent = true;
    this.runGen += 1;
    this.sessionOp += 1;
    this.reconnectFails = 0;
    abortClientRpcs(this, 'cancel');
    this.queue = [];
    this.dropAgent();
    this.messages = [];
    this.journal.clear();
    await this.beginStart();
  }

  async newSession(): Promise<void> {
    this.sessionOp += 1;
    this.cancelTurn();
    this.agent?.clearSession();
    this.messages = [];
    this.journal.clear();
    this.drawer = undefined;
    drawers.stopDashboardPoll(this);
    this.replaying = false;
    this.restoringSession = false;
    this.hideSessionPreview = true;
    this.currentSessionId = undefined;
    this.sessionCwd = undefined;
    this.setStatus('ready');
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
    abortClientRpcs(this, 'cancel');
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
      try {
        await agent.interject(trimmed);
      } catch {
        this.queue = [...this.queue, trimmed];
        this.emit();
      }
      return;
    }
    this.error = undefined;
    const run = ++this.runGen;
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
      await agent.prompt(blocks, { mode: promptModeMeta(this.modeId) });
    } catch (error) {
      if (run !== this.runGen) {
        return;
      }
      if (isCancelError(error)) {
        this.finishAssistant();
        this.setStatus('ready');
        return;
      }
      this.finishAssistant();
      this.fail(tr('turnError'), error);
      return;
    }
    if (run !== this.runGen) {
      return;
    }
    this.finishAssistant();
    this.setStatus('ready');
    await this.flushQueue();
  }

  cancelTurn(): void {
    this.runGen += 1;
    abortClientRpcs(this, 'cancel');
    this.agent?.cancelTurn();
    this.queue = [];
    if (this.status === 'streaming') {
      this.finishAssistant();
      this.setStatus('ready');
    }
  }

  async choosePermission(optionId: string): Promise<void> {
    await choosePermissionRpc(this, optionId);
  }

  cancelPermission(): void {
    cancelPermissionRpc(this);
  }

  async askUserQuestion(params: unknown): Promise<unknown> {
    return askUserQuestionRpc(this, params);
  }

  async reviewPlan(params: unknown): Promise<unknown> {
    return reviewPlanRpc(this, params);
  }

  answerAsk(choiceIds: string[], notes?: string): void {
    answerAskRpc(this, choiceIds, notes);
  }

  cancelAsk(): void {
    cancelAskRpc(this);
  }

  private dropAgent(): void {
    this.agentGen += 1;
    this.clearReconnectTimer();
    const agent = this.agent;
    this.agent = undefined;
    try {
      agent?.dispose();
    } catch {
      /* already dead */
    }
    disposeAllTerminals();
  }

  private onAgentLost(epoch: number, error: Error): void {
    if (epoch !== this.agentGen) {
      return;
    }
    this.agent = undefined;
    abortClientRpcs(this, 'cancel');
    disposeAllTerminals();
    this.agentGen += 1;
    if (!this.wantAgent) {
      return;
    }
    this.scheduleReconnect(error);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

  private scheduleReconnect(error: Error): void {
    if (this.status === 'streaming') {
      this.finishAssistant();
      this.status = 'ready';
    }
    this.reconnectFails += 1;
    const delay = reconnectDelayMs(this.reconnectFails);
    if (delay === undefined) {
      logWarn(`agent exited, giving up after ${this.reconnectFails} attempts: ${error.message}`);
      this.fail(tr('agentExitedGiveUp'), error);
      return;
    }
    logWarn(
      `agent exited, retry ${this.reconnectFails}/${AGENT_RECONNECT_MAX} in ${delay}ms: ${error.message}`,
    );
    this.error = tr('agentExited');
    this.emit();
    this.clearReconnectTimer();
    const epoch = this.agentGen;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (!this.wantAgent || epoch !== this.agentGen || this.agent || this.starting) {
        return;
      }
      void this.beginStart();
    }, delay);
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
    this.pendingEffort = level;
    this.patchCurrentEffort(level);
    const modelId = this.selectedModelId();
    if (!this.agent?.sessionId || !modelId) {
      this.emit();
      return;
    }
    try {
      await this.agent.setModel(modelId, { reasoningEffort: level });
    } catch (error) {
      logWarn(`set effort via model meta failed: ${error}`);
      await this.sendAgentSlash(`/effort ${level}`);
    }
  }

  async setModel(modelId: string): Promise<void> {
    if (this.busyTurn()) {
      return;
    }
    this.pendingModelId = modelId;
    if (this.models) {
      this.models = { ...this.models, currentId: modelId };
      const effort = this.selectedEffort();
      if (effort) {
        this.patchCurrentEffort(effort);
      }
      this.emit();
    }
    if (!this.agent?.sessionId) {
      return;
    }
    try {
      const effort = this.selectedEffort();
      await this.agent.setModel(modelId, effort ? { reasoningEffort: effort } : undefined);
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
      await this.applySessionMode(modeId);
    } catch (error) {
      this.fail('Could not change mode', error);
    }
  }

  async applySessionMode(modeId: string): Promise<void> {
    await this.agent?.setMode(modeId);
    this.modeId = modeId;
    this.note(`Mode: ${modeLabel(modeId)}`);
    this.emit();
  }

  async compact(note?: string): Promise<void> {
    try {
      await this.agent?.compact(note);
      this.note(tr('compactDone'));
    } catch (error) {
      this.fail('Compact failed', error);
    }
  }

  async rewind(): Promise<void> {
    try {
      const points = await this.agent?.rewindPoints();
      if (!points?.length) {
        this.note(tr('rewindEmpty'));
        return;
      }
      const picked = await plat().pick(
        tr('rewindPick'),
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

  async forkCurrent(): Promise<void> {
    const agent = this.agent;
    const sourceId = this.currentSessionId ?? agent?.sessionId;
    if (!agent || !sourceId) {
      plat().warn(tr('forkNeedSession'));
      return;
    }
    const sourceCwd = this.sessionCwd ?? this.cwd();
    try {
      let worktree = false;
      if (await isGitCwd(sourceCwd)) {
        const pick = await plat().pick(tr('forkWorktreeQ'), [
          { label: tr('forkWorktreeYes'), description: tr('forkWorktreeYesHint'), value: 'yes' },
          { label: tr('forkWorktreeNo'), description: tr('forkWorktreeNoHint'), value: 'no' },
        ]);
        if (!pick) {
          return;
        }
        worktree = pick === 'yes';
      }
      if (worktree) {
        const resumed = await agent.resumeInWorktree(sourceId, sourceCwd);
        if (!resumed?.sessionId) {
          plat().warn(tr('forkWorktreeFailed'));
          return;
        }
        await this.loadSession(resumed.sessionId, resumed.cwd || sourceCwd);
        return;
      }
      const id = await agent.forkSession({
        sourceSessionId: sourceId,
        sourceCwd,
        newCwd: sourceCwd,
        sessionKind: 'fork',
      });
      if (!id) {
        plat().warn(tr('forkFailed'));
        return;
      }
      await this.loadSession(id, sourceCwd);
    } catch (error) {
      this.fail('Fork failed', error);
    }
  }

  async renameListedSession(id?: string, title?: string, auto?: boolean): Promise<void> {
    const sessionId = id ?? this.currentSessionId;
    if (!sessionId) {
      return;
    }
    const name = auto ? '' : title ?? (await plat().input(tr('sessionsRename')));
    if (!auto && !name) {
      return;
    }
    try {
      await this.agent?.renameSession(name ?? '', Boolean(auto), sessionId);
      if (this.sessions) {
        this.sessions = this.sessions.map((row) =>
          row.id === sessionId && name ? { ...row, title: name } : row,
        );
      }
      this.emit();
      void this.refreshSessionsSilent();
      if (name) {
        this.note(tr('sessionsRenamed', { name }));
      }
    } catch (error) {
      this.fail('Rename failed', error);
    }
  }

  async deleteListedSession(id?: string): Promise<void> {
    const sessionId = id ?? this.currentSessionId;
    if (!sessionId) {
      return;
    }
    const row = this.sessions?.find((item) => item.id === sessionId);
    const ok = await plat().confirm(
      tr('sessionsDeleteConfirm', { name: row?.title ?? sessionId }),
      tr('sessionsDelete'),
    );
    if (!ok) {
      return;
    }
    try {
      await this.agent?.deleteSession(sessionId);
      if (sessionId === this.currentSessionId) {
        await this.newSession();
      }
      await this.refreshSessionsSilent();
    } catch (error) {
      this.fail('Delete failed', error);
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
    const op = ++this.sessionOp;
    this.cancelTurn();
    const cwd =
      sessionCwd ??
      this.sessions?.find((row) => row.id === sessionId)?.cwd ??
      this.cwd();
    this.messages = [];
    this.journal.clear();
    this.drawer = undefined;
    drawers.stopDashboardPoll(this);
    this.hideSessionPreview = false;
    this.restoringSession = true;
    this.replaying = true;
    this.currentSessionId = sessionId;
    this.sessionCwd = cwd;
    this.emit();
    try {
      const result = await agent.loadSession(sessionId, cwd, this.sessionMeta());
      if (op !== this.sessionOp) {
        return;
      }
      this.models = modelsFromResult(result) ?? this.models;
      this.currentSessionId = agent.sessionId ?? sessionId;
      finalizeReplayTimes(this.messages);
      this.setStatus('ready');
      void this.journal.hydrateFromGit().then(() => this.emit());
      void this.meter.refresh();
    } catch (error) {
      if (op !== this.sessionOp) {
        return;
      }
      this.fail('Could not restore that session', error);
    } finally {
      if (op === this.sessionOp) {
        this.replaying = false;
        this.restoringSession = false;
        finalizeReplayTimes(this.messages);
        this.emit();
      }
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
      theme: this.theme,
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

  closeDrawer(): void { drawers.closeDrawer(this); }
  async openDashboard(): Promise<void> { await drawers.openDashboard(this); }
  refreshDashboard(): void { drawers.refreshDashboard(this); }
  stopRosterSession(sessionId: string): void { drawers.stopRosterSession(this, sessionId); }
  async cancelSubagent(subagentId: string): Promise<void> { await drawers.cancelSubagent(this, subagentId); }
  async dashboardDispatch(text: string, sessionId?: string): Promise<void> {
    await drawers.dashboardDispatch(this, text, sessionId);
  }
  openSettings(): void { drawers.openSettings(this); }
  closeSettings(): void { drawers.closeSettings(this); }
  openRules(): void { drawers.openRules(this); }
  closeRules(): void { drawers.closeRules(this); }
  async importRules(): Promise<void> { await drawers.importRules(this); }
  async toggleRule(id: string): Promise<void> { await drawers.toggleRule(this, id); }
  async deleteRule(id: string): Promise<void> { await drawers.deleteRule(this, id); }
  openRule(id: string): void { drawers.openRule(id); }
  openSkills(): void { drawers.openSkills(this); }
  closeSkills(): void { drawers.closeSkills(this); }
  async importSkillZip(): Promise<void> { await drawers.importSkillZip(this); }
  async importSkillFolder(): Promise<void> { await drawers.importSkillFolder(this); }
  async toggleSkill(id: string): Promise<void> { await drawers.toggleSkill(this, id); }
  async deleteSkill(id: string): Promise<void> { await drawers.deleteSkill(this, id); }
  openSkill(id: string): void { drawers.openSkill(this, id); }
  openApis(): void { drawers.openApis(this); }
  closeApis(): void { drawers.closeApis(this); }
  openTheme(): void { drawers.openTheme(this); }
  closeTheme(): void { drawers.closeTheme(this); }
  openMcps(): void { drawers.openMcps(this); }
  closeMcps(): void { drawers.closeMcps(this); }
  openAgents(): void { drawers.openAgents(this); }
  closeAgents(): void { drawers.closeAgents(this); }
  async importAgents(): Promise<void> { await drawers.importAgents(this); }
  async toggleAgent(id: string): Promise<void> { await drawers.toggleAgent(this, id); }
  async deleteAgent(id: string): Promise<void> { await drawers.deleteAgent(this, id); }
  openAgent(id: string): void { drawers.openAgent(this, id); }
  async setAgentProfile(name: string): Promise<void> { await drawers.setAgentProfile(this, name); }
  async importPersonas(): Promise<void> { await drawers.importPersonas(this); }
  async togglePersona(id: string): Promise<void> { await drawers.togglePersona(this, id); }
  async deletePersona(id: string): Promise<void> { await drawers.deletePersona(this, id); }
  openPersona(id: string): void { drawers.openPersona(this, id); }
  openWorktrees(): void { drawers.openWorktrees(this); }
  closeWorktrees(): void { drawers.closeWorktrees(this); }
  async applyWorktree(id: string): Promise<void> { await drawers.applyWorktree(this, id); }
  async removeWorktree(id: string): Promise<void> { await drawers.removeWorktree(this, id); }
  openExt(tab?: string): void { drawers.openExt(this, tab); }
  closeExt(): void { drawers.closeExt(this); }
  setExtTab(tab: 'plugins' | 'marketplace' | 'hooks' | 'workflows'): void { drawers.setExtTab(this, tab); }
  async togglePlugin(id: string): Promise<void> { await drawers.togglePlugin(this, id); }
  async uninstallPlugin(id: string): Promise<void> { await drawers.uninstallPlugin(this, id); }
  async toggleHook(id: string): Promise<void> { await drawers.toggleHook(this, id); }
  async installMarketplace(id: string): Promise<void> { await drawers.installMarketplace(this, id); }
  async refreshMarketplace(): Promise<void> { await drawers.refreshMarketplace(this); }
  async runWorkflow(name: string): Promise<void> { await drawers.runWorkflow(this, name); }
  async openTasks(): Promise<void> { await drawers.openTasks(this); }
  async killTask(taskId: string): Promise<void> { await drawers.killTask(this, taskId); }
  openMemory(): void { drawers.openMemory(this); }
  closeMemory(): void { drawers.closeMemory(this); }
  openMemoryFile(id: string): void { drawers.openMemoryFile(this, id); }
  async flushMemory(): Promise<void> { await drawers.flushMemory(this); }
  openPlan(): void { drawers.openPlan(this); }
  refreshMcps(): void { drawers.refreshMcps(this); }
  async toggleMcp(id: string): Promise<void> { await drawers.toggleMcp(this, id); }
  setTheme(primary: string, secondary: string, background?: string): void {
    drawers.setTheme(this, primary, secondary, background);
  }
  async saveApi(input: {
    id?: string;
    name: string;
    model: string;
    baseUrl: string;
    backend: ApiEndpoint['backend'];
    apiKey?: string;
  }): Promise<void> { await drawers.saveApi(this, input); }
  async deleteApi(id: string): Promise<void> { await drawers.deleteApi(this, id); }
  async updateSetting(key: keyof GrokSettings, value: string | boolean): Promise<void> {
    await drawers.updateSetting(this, key, value);
  }
  toggleUiFlag(flag: 'compactMode' | 'timestamps' | 'multiline'): void {
    drawers.toggleUiFlag(this, flag);
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
    const run = ++this.runGen;
    this.setStatus('streaming');
    try {
      await agent.prompt([{ type: 'text', text }], { mode: promptModeMeta(this.modeId) });
    } catch (error) {
      if (run !== this.runGen) {
        return;
      }
      if (isCancelError(error)) {
        this.finishAssistant();
        this.setStatus('ready');
        return;
      }
      this.finishAssistant();
      this.fail('Command failed', error);
      return;
    }
    if (run !== this.runGen) {
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

  applyModelsUpdate(params: unknown): void {
    const next = mergeModelCatalog(this.models, params);
    if (!next) {
      return;
    }
    this.models = next;
    this.emit();
  }

  applyIncomingUpdate(update: SessionUpdate, isReplay = false, sessionId?: string): void {
    if (this.hideSessionPreview && !this.agent?.sessionId) {
      return;
    }
    if (sessionId && this.currentSessionId && sessionId !== this.currentSessionId) {
      return;
    }
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

  allowsFileWrites(): boolean {
    return this.modeId !== 'ask';
  }

  async requestToolPermission(params: unknown): Promise<unknown> {
    return requestToolPermissionRpc(this, params);
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
    const epoch = this.agentGen;
    this.error = undefined;
    if (this.messages.length === 0) {
      this.setStatus('connecting');
    }
    if (!plat().isTrusted()) {
      this.setStatus('untrusted');
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
    if (epoch !== this.agentGen) {
      return;
    }
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
    let spawned: GrokAgent | undefined;
    try {
      const hints = this.startupHints();
      if (hints) {
        logInfo('heavy workspace: skip git status and project layout at session start');
      }
      spawned = GrokAgent.spawn(
        {
          cliPath,
          cwd: this.cwd(),
          extensionVersion: plat().extensionVersion(),
          startupHints: hints,
        },
        (method, params, id) => this.onIncoming(method, params, id),
        (error) => this.onAgentLost(epoch, error),
      );
      if (epoch !== this.agentGen) {
        spawned.dispose();
        return;
      }
      const init = await spawned.initialize();
      if (epoch !== this.agentGen) {
        spawned.dispose();
        return;
      }
      this.agent = spawned;
      this.reconnectFails = 0;
      this.agentVersion = spawned.agentVersion();
      this.models = modelsFromResult(init) ?? this.models;
      this.applyPendingModelSelection();
      const methods = spawned.authMethods();
      const defaultId = spawned.defaultAuthMethodId();
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
        await spawned.authenticate(methodId);
      }
      if (epoch !== this.agentGen) {
        return;
      }
      this.account = await spawned.authInfo().catch(() => undefined);
      if (epoch !== this.agentGen) {
        return;
      }
      this.commands = mergeCommands(spawned.availableCommands(), FALLBACK_COMMANDS);
      void spawned.commandsList().then((cmds) => {
        if (epoch !== this.agentGen) {
          return;
        }
        this.commands = mergeCommands(cmds, FALLBACK_COMMANDS);
        this.emit();
      });
      this.setStatus('ready');
      void drawers.refreshApis(this);
      setTimeout(() => {
        if (epoch === this.agentGen) {
          void this.refreshSessionsSilent();
        }
      }, 800);
    } catch (error) {
      const stillThisAttempt = epoch === this.agentGen;
      if (this.agent === spawned) {
        this.agent = undefined;
      }
      if (stillThisAttempt) {
        this.agentGen += 1;
      }
      try {
        spawned?.dispose();
      } catch {
        /* already dead */
      }
      if (!stillThisAttempt) {
        return;
      }
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

  private startupHints(): { skipGitStatus: boolean; skipProjectLayout: boolean } | undefined {
    const folders = plat().workspaceFolders();
    return workspaceStartupHints(folders.length ? folders : [this.cwd()]);
  }

  private sessionMeta(): Record<string, unknown> {
    const extra: Record<string, unknown> = { ...sessionPermissionMeta(readGrokSettings()) };
    const hints = this.startupHints();
    if (hints) {
      extra.startupHints = hints;
    }
    const wantedId = this.selectedModelId();
    const wantedEffort = this.selectedEffort();
    if (wantedId) {
      extra.modelId = wantedId;
    }
    if (wantedEffort) {
      extra.reasoningEffort = wantedEffort;
    }
    if (this.agentProfile) {
      extra.agentProfile = this.agentProfile;
    }
    return extra;
  }

  private async createSession(agent: GrokAgent): Promise<void> {
    const extra = this.sessionMeta();
    const wantedId = this.selectedModelId();
    const wantedEffort = this.selectedEffort();
    const result = await agent.newSession(this.cwd(), extra);
    this.currentSessionId = agent.sessionId ?? result.sessionId;
    this.sessionCwd = this.cwd();
    this.models = modelsFromResult(result) ?? this.models;
    if (wantedId && this.models?.currentId !== wantedId) {
      try {
        await agent.setModel(wantedId, wantedEffort ? { reasoningEffort: wantedEffort } : undefined);
      } catch (error) {
        logWarn(`apply selected model: ${error instanceof Error ? error.message : error}`);
      }
    }
    this.applyPendingModelSelection();
    if (this.modeId === 'ask' || this.modeId === 'plan') {
      try {
        await agent.setMode(this.modeId);
      } catch (error) {
        logWarn(`apply session mode: ${error instanceof Error ? error.message : error}`);
      }
    }
    void this.meter.refresh();
    if (this.settingsOpen && this.settingsPage === 'mcps') {
      void drawers.refreshMcpsInner(this);
    }
  }

  private selectedModelId(): string | undefined {
    return this.pendingModelId ?? this.models?.currentId;
  }

  private selectedEffort(): string | undefined {
    if (this.pendingEffort) {
      return this.pendingEffort;
    }
    const id = this.selectedModelId();
    const model = this.models?.available.find((item) => item.id === id);
    if (model?.currentEffort) {
      return model.currentEffort;
    }
    if (model?.efforts?.length) {
      return model.efforts.includes('high') ? 'high' : model.efforts[0];
    }
    if (id && this.apis.some((item) => item.id === id)) {
      return 'high';
    }
    return undefined;
  }

  private applyPendingModelSelection(): void {
    if (!this.models) {
      return;
    }
    const wantedId = this.selectedModelId();
    if (wantedId && this.models.currentId !== wantedId) {
      this.models = { ...this.models, currentId: wantedId };
    }
    const effort = this.selectedEffort();
    if (effort) {
      this.patchCurrentEffort(effort);
    }
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

  fail(message: string, error?: unknown): void {
    const parsed = error !== undefined ? formatAgentError(error) : { message };
    const line =
      parsed.message === message ? formatErrorLine(parsed) : `${message}: ${formatErrorLine(parsed)}`;
    this.error = line;
    const assistant = this.messages.filter((item) => item.role === 'assistant').at(-1);
    if (assistant) {
      assistant.error = parsed;
      assistant.streaming = false;
    }
    if (this.status === 'streaming' || this.status === 'ready') {
      this.status = 'ready';
      plat().warn(line);
    } else if (this.status !== 'login' && this.status !== 'authenticating') {
      this.status = 'error';
    }
    logError(message, error);
    this.emit();
  }
}

async function isGitCwd(cwd: string): Promise<boolean> {
  for (const gitPath of gitProbePaths(cwd)) {
    if (await plat().fileExists(gitPath)) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
