export type ChatStatus =
  | 'untrusted'
  | 'missingCli'
  | 'connecting'
  | 'login'
  | 'authenticating'
  | 'ready'
  | 'streaming'
  | 'error';

export type AuthUrlMode = 'loopback' | 'device' | 'command';

export interface AccountInfo {
  email?: string;
  firstName?: string;
  lastName?: string;
  methodId?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  efforts?: string[];
  currentEffort?: string;
}

export interface SlashCommandInfo {
  name: string;
  description: string;
  hint?: string;
}

export interface ContextCategory {
  label: string;
  tokens: number;
  detail?: string;
}

export interface ContextUsage {
  used: number;
  total: number;
  percent: number;
  free?: number;
  systemTokens?: number;
  messageTokens?: number;
  toolTokens?: number;
  compactAt?: number;
  categories?: ContextCategory[];
}

export type SettingsPage =
  | 'main'
  | 'rules'
  | 'skills'
  | 'apis'
  | 'api-form'
  | 'theme'
  | 'theme-preview'
  | 'mcps'
  | 'agents'
  | 'worktrees'
  | 'extensions'
  | 'memory';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background?: string;
  /** Bundled Grok mark, or a user-picked image/video copied into ~/.grok. */
  wallpaper?: 'icon' | 'custom';
  /** 0–100. Media layer only; empty areas keep the background color. */
  wallpaperOpacity?: number;
  wallpaperPath?: string;
  /** Host-resolved webview / file URL. Not persisted. */
  wallpaperUrl?: string;
  /** Zoom 20–800 percent of the viewport width. When set, the media is placed manually instead of auto-fit. */
  wallpaperScale?: number;
  wallpaperX?: number;
  wallpaperY?: number;
  /** Chat chrome: frosted glass or an opaque floating sheet. */
  surface?: 'glass' | 'solid';
  /** 0–100 mix of --bg into the frosted panel. */
  glassOpacity?: number;
  /** Wallpaper blur in px, 0–40. */
  glassBlur?: number;
  /** Component frost blur in px, 0–40. Independent of wallpaper blur. */
  chromeBlur?: number;
  /** Frost cards and buttons as well as the main plate. */
  chromeGlass?: boolean;
  /** 0–100 mix of --bg into frosted cards/buttons. */
  chromeGlassOpacity?: number;
}

export type ApiBackend = 'chat_completions' | 'responses' | 'messages';

export interface ApiEndpoint {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  backend: ApiBackend;
  hasKey: boolean;
  enabled: boolean;
  /** Token window written to grok config.toml as context_window. */
  contextWindow?: number;
}

export interface RuleItem {
  id: string;
  name: string;
  filePath: string;
  scope: 'global' | 'project';
  /** Where Grok actually discovered the file. */
  origin?: 'grok' | 'claude' | 'cursor';
  enabled: boolean;
}

export interface SkillItem {
  id: string;
  name: string;
  description?: string;
  dirPath: string;
  skillFile: string;
  scope: 'global' | 'project';
  enabled: boolean;
}

export interface McpItem {
  id: string;
  name: string;
  source: 'managed' | 'local';
  enabled: boolean;
  status?: string;
  toolCount: number;
  sourceLabel?: string;
}

export type RosterActivity =
  | 'working'
  | 'idle'
  | 'needs_input'
  | 'dormant'
  | 'completed'
  | 'dead';

export interface RosterEntry {
  id: string;
  title: string;
  cwd: string;
  isWorktree: boolean;
  modelId?: string;
  activity: RosterActivity;
  lastTurnSummary?: string;
  resident?: boolean;
}

export interface SubagentLive {
  id: string;
  parentSessionId: string;
  childSessionId?: string;
  type: string;
  description: string;
  durationMs: number;
  contextUsagePct?: number;
}

export interface AgentDefItem {
  id: string;
  name: string;
  description?: string;
  filePath?: string;
  scope: 'builtin' | 'global' | 'project';
  enabled: boolean;
}

export interface PersonaItem {
  id: string;
  name: string;
  description?: string;
  filePath: string;
  scope: 'global' | 'project';
  enabled: boolean;
}

export interface WorktreeItem {
  id: string;
  path: string;
  repoName: string;
  sourceRepo: string;
  kind: string;
  status: 'alive' | 'dead';
  sessionId?: string;
  gitRef?: string;
  label?: string;
  createdAt?: number;
}

export interface WorktreeApplyResult {
  ok: boolean;
  files?: number;
  conflicts?: number;
  message?: string;
}

export interface PluginItem {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  version?: string;
  scope?: string;
  skillCount: number;
  source?: string;
}

export interface HookItem {
  id: string;
  name: string;
  event: string;
  enabled: boolean;
  matcher?: string;
  command?: string;
}

export interface MarketplacePlugin {
  id: string;
  name: string;
  description?: string;
  sourceUrl: string;
  sourceName: string;
  relativePath: string;
  installStatus: string;
  version?: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  whenToUse?: string;
  source: string;
  path?: string;
}

export interface TaskItem {
  id: string;
  command: string;
  cwd: string;
  kind: string;
  completed: boolean;
  exitCode?: number;
  truncated?: boolean;
}

export interface MemoryFile {
  id: string;
  name: string;
  filePath: string;
  scope: 'global' | 'workspace';
}

export interface SessionRow {
  id: string;
  title: string;
  updatedAt?: string;
  cwd?: string;
  hidden?: boolean;
  sessionKind?: string;
  numChatMessages?: number;
  numMessages?: number;
}

export interface MediaItem {
  mimeType: string;
  data?: string;
  uri?: string;
}

export interface Attachment {
  id: string;
  label: string;
  path?: string;
  text?: string;
  mimeType?: string;
  data?: string;
}

export interface FileEdit {
  path: string;
  added: number;
  removed: number;
  previous?: string;
  next?: string;
}

export interface ToolCard {
  id: string;
  title: string;
  kind?: string;
  status: string;
  detail?: string;
}

export interface TurnError {
  message: string;
  code?: string;
  retrying?: boolean;
  attempt?: number;
  maxAttempts?: number;
}

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'abandoned';

export interface PlanStep {
  content: string;
  status: PlanStepStatus;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  thinking?: string;
  tools: ToolCard[];
  images?: MediaItem[];
  edits?: FileEdit[];
  plan?: string;
  steps?: PlanStep[];
  streaming?: boolean;
  createdAt?: string;
  endedAt?: string;
  error?: TurnError;
  /** Catalog id at the time this assistant turn started. */
  modelId?: string;
  /** Picker display name for that model. */
  modelName?: string;
  /** Reasoning effort sent with this turn. */
  effort?: string;
}

export interface PermissionOption {
  optionId: string;
  name: string;
  kind: string;
}

export interface PermissionPrompt {
  requestId: string;
  title: string;
  details?: string;
  toolKind?: string;
  options: PermissionOption[];
  /** Real ACP allow id when this card is the Ask-mode switch gate. */
  allowOptionId?: string;
}

export interface AskChoice {
  id: string;
  label: string;
  description?: string;
  other?: boolean;
}

export interface AskCard {
  requestId: string;
  kind: 'question' | 'plan';
  title: string;
  body?: string;
  choices: AskChoice[];
  index?: number;
  total?: number;
  multiSelect?: boolean;
}

export interface LoginView {
  url?: string;
  mode?: AuthUrlMode;
  label?: string;
}

export type DrawerId = 'sessions' | 'extensions' | 'history' | 'dashboard' | 'tasks' | 'plan' | undefined;

export interface GrokSettings {
  cliPath: string;
  preferWorkspaceBinary: boolean;
  minCliVersion: string;
  permissionMode: 'ask' | 'auto' | 'acceptEdits';
  includeSelectionOnSend: boolean;
  alwaysApprove: boolean;
  locale: 'auto' | 'en' | 'zh-CN';
  /** Play a chime when a turn finishes or is interrupted. */
  notifySound: boolean;
}

export const DEFAULT_SETTINGS: GrokSettings = {
  cliPath: '',
  preferWorkspaceBinary: false,
  minCliVersion: '0.1.0',
  permissionMode: 'ask',
  includeSelectionOnSend: true,
  alwaysApprove: false,
  locale: 'auto',
  notifySound: true,
};

export function settingNeedsRestart(key: keyof GrokSettings): boolean {
  return key === 'cliPath' || key === 'preferWorkspaceBinary' || key === 'minCliVersion';
}

export interface ChatState {
  status: ChatStatus;
  error?: string;
  cliPath?: string;
  cliInstallHint?: string;
  account?: AccountInfo;
  login?: LoginView;
  models?: { currentId: string; available: ModelOption[] };
  modeId?: string;
  messages: ChatMessage[];
  permission?: PermissionPrompt;
  ask?: AskCard;
  attachments: Attachment[];
  agentVersion?: string;
  commands: SlashCommandInfo[];
  sessions?: SessionRow[];
  history?: string[];
  drawer?: DrawerId;
  drawerTab?: string;
  drawerBody?: string;
  fileHits?: Array<{ path: string; label: string }>;
  compactMode?: boolean;
  timestamps?: boolean;
  multiline?: boolean;
  queue?: string[];
  alwaysApprove?: boolean;
  notify?: 'done' | 'fail';
  currentSessionId?: string;
  restoringSession?: boolean;
  hideSessionPreview?: boolean;
  workspacePath?: string;
  locale?: 'en' | 'zh-CN';
  context?: ContextUsage;
  settings?: GrokSettings;
  settingsOpen?: boolean;
  settingsPage?: SettingsPage;
  apiEditId?: string;
  rules?: RuleItem[];
  skills?: SkillItem[];
  apis?: ApiEndpoint[];
  mcps?: McpItem[];
  agents?: AgentDefItem[];
  personas?: PersonaItem[];
  roster?: RosterEntry[];
  subagents?: SubagentLive[];
  agentProfile?: string;
  worktrees?: WorktreeItem[];
  plugins?: PluginItem[];
  hooks?: HookItem[];
  marketplace?: MarketplacePlugin[];
  workflows?: WorkflowItem[];
  tasks?: TaskItem[];
  memoryFiles?: MemoryFile[];
  extTab?: 'plugins' | 'marketplace' | 'hooks' | 'workflows';
  theme?: ThemeColors;
}

export interface AuthMethodWire {
  type?: string;
  id?: string;
  name?: string;
  description?: string;
  _meta?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface InitializeResult {
  protocolVersion?: number | string;
  authMethods?: AuthMethodWire[];
  agentCapabilities?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

export interface SessionNewResult {
  sessionId: string;
  _meta?: Record<string, unknown>;
  models?: {
    currentModelId?: string;
    availableModels?: Array<{ modelId?: string; name?: string }>;
  };
}

export interface ContentBlock {
  type?: string;
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  name?: string;
  path?: string;
  oldText?: string;
  newText?: string;
  resource?: { uri?: string; text?: string; mimeType?: string };
}

export interface SessionUpdate {
  sessionUpdate?: string;
  content?: ContentBlock | ContentBlock[];
  toolCallId?: string;
  title?: string;
  kind?: string;
  status?: string;
  type?: string;
  attempt?: number;
  maxRetries?: number;
  attempts?: number;
  reason?: string;
  errorType?: string;
  message?: string;
  error?: string;
  isRateLimited?: boolean;
  rawInput?: unknown;
  rawOutput?: unknown;
  locations?: Array<{ path?: string }>;
  currentModelId?: string;
  currentModeId?: string;
  modeId?: string;
  availableCommands?: SlashCommandInfo[];
  used?: number;
  size?: number;
  total?: number;
  turnStartMs?: number;
  streamStartMs?: number;
  agentTimestampMs?: number;
  entries?: unknown;
}

export interface HostToWebview {
  type: 'state';
  state: ChatState;
}

export interface StreamTail {
  type: 'tail';
  message: ChatMessage;
  status: ChatStatus;
  context?: ContextUsage;
  queue?: string[];
}

export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'login' }
  | { type: 'skipLogin' }
  | { type: 'openLoginUrl' }
  | { type: 'submitAuthCode'; code: string }
  | { type: 'cancelLogin' }
  | { type: 'setApiKey'; key: string }
  | { type: 'logout' }
  | { type: 'send'; text: string }
  | { type: 'cancel' }
  | { type: 'newSession' }
  | { type: 'restart' }
  | { type: 'choosePermission'; optionId: string }
  | { type: 'cancelPermission' }
  | { type: 'answerAsk'; choiceId?: string; choiceIds?: string[]; notes?: string }
  | { type: 'cancelAsk' }
  | { type: 'removeAttachment'; id: string }
  | { type: 'openFile'; path: string }
  | { type: 'openUrl'; url: string }
  | { type: 'setModel'; modelId: string }
  | { type: 'setMode'; modeId: string }
  | { type: 'setEffort'; level: string }
  | { type: 'installCli' }
  | {
      type: 'openDrawer';
      drawer: 'sessions' | 'extensions' | 'history' | 'dashboard' | 'tasks' | 'plan';
      tab?: string;
    }
  | { type: 'closeDrawer' }
  | { type: 'loadSession'; sessionId: string; cwd?: string }
  | { type: 'renameSession'; sessionId: string }
  | { type: 'deleteSession'; sessionId: string }
  | { type: 'rewindTo'; index: number }
  | { type: 'searchFiles'; query: string }
  | { type: 'pickFile'; path: string }
  | { type: 'copyLast' }
  | { type: 'copyText'; text: string }
  | { type: 'editUserPrompt'; messageId: string; text: string }
  | { type: 'exportChat' }
  | { type: 'attach' }
  | { type: 'openSettings' }
  | { type: 'closeSettings' }
  | { type: 'openRules' }
  | { type: 'closeRules' }
  | { type: 'importRules' }
  | { type: 'toggleRule'; id: string }
  | { type: 'deleteRule'; id: string }
  | { type: 'openRule'; id: string }
  | { type: 'openSkills' }
  | { type: 'closeSkills' }
  | { type: 'importSkillZip' }
  | { type: 'importSkillFolder' }
  | { type: 'toggleSkill'; id: string }
  | { type: 'deleteSkill'; id: string }
  | { type: 'openSkill'; id: string }
  | { type: 'openApis' }
  | { type: 'closeApis' }
  | { type: 'openApiForm'; id?: string }
  | { type: 'closeApiForm' }
  | { type: 'toggleApi'; id: string }
  | { type: 'openTheme' }
  | { type: 'closeTheme' }
  | {
      type: 'setTheme';
      primary: string;
      secondary: string;
      background?: string;
      wallpaper?: 'icon' | 'custom' | '';
      wallpaperOpacity?: number;
      wallpaperScale?: number;
      wallpaperX?: number;
      wallpaperY?: number;
      surface?: 'glass' | 'solid' | '';
      glassOpacity?: number;
      glassBlur?: number;
      chromeBlur?: number;
      chromeGlass?: boolean;
      chromeGlassOpacity?: number;
    }
  | { type: 'pickThemeWallpaper' }
  | { type: 'openThemePreview' }
  | { type: 'closeThemePreview' }
  | { type: 'openMcps' }
  | { type: 'closeMcps' }
  | { type: 'toggleMcp'; id: string }
  | { type: 'openAgents' }
  | { type: 'closeAgents' }
  | { type: 'importAgents' }
  | { type: 'toggleAgent'; id: string }
  | { type: 'deleteAgent'; id: string }
  | { type: 'openAgent'; id: string }
  | { type: 'setAgentProfile'; name: string }
  | { type: 'importPersonas' }
  | { type: 'togglePersona'; id: string }
  | { type: 'deletePersona'; id: string }
  | { type: 'openPersona'; id: string }
  | { type: 'switchRosterSession'; sessionId: string; cwd?: string }
  | { type: 'stopRosterSession'; sessionId: string }
  | { type: 'cancelSubagent'; subagentId: string }
  | { type: 'dashboardDispatch'; text: string; sessionId?: string }
  | { type: 'openWorktrees' }
  | { type: 'closeWorktrees' }
  | { type: 'applyWorktree'; id: string }
  | { type: 'removeWorktree'; id: string }
  | { type: 'openExt' }
  | { type: 'closeExt' }
  | { type: 'setExtTab'; tab: 'plugins' | 'marketplace' | 'hooks' | 'workflows' }
  | { type: 'togglePlugin'; id: string }
  | { type: 'uninstallPlugin'; id: string }
  | { type: 'toggleHook'; id: string }
  | { type: 'installMarketplace'; id: string }
  | { type: 'refreshMarketplace' }
  | { type: 'runWorkflow'; name: string }
  | { type: 'killTask'; taskId: string }
  | { type: 'openMemory' }
  | { type: 'closeMemory' }
  | { type: 'openMemoryFile'; id: string }
  | { type: 'flushMemory' }
  | {
      type: 'saveApi';
      id?: string;
      name: string;
      model: string;
      baseUrl: string;
      backend: ApiBackend;
      apiKey?: string;
      contextWindow?: number;
    }
  | { type: 'deleteApi'; id: string }
  | {
      type: 'updateSetting';
      key: keyof GrokSettings;
      value: string | boolean;
    }
  | { type: 'toggleFlag'; flag: 'compactMode' | 'timestamps' | 'multiline' }
  | { type: 'runSlash'; command: string }
  | {
      type: 'pasteClipboard';
      text?: string;
      uris?: string[];
      images?: Array<{ name: string; mimeType: string; data: string }>;
    }
  | { type: 'undoEdits'; messageId?: string }
  | { type: 'reviewEdits'; messageId?: string; path?: string }
  | { type: 'openEdit'; path: string; messageId?: string };
