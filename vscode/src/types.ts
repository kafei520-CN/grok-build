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

export type SettingsPage = 'main' | 'rules' | 'skills' | 'apis' | 'theme' | 'mcps';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background?: string;
}

export type ApiBackend = 'chat_completions' | 'responses' | 'messages';

export interface ApiEndpoint {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  backend: ApiBackend;
  hasKey: boolean;
}

export interface RuleItem {
  id: string;
  name: string;
  filePath: string;
  scope: 'global' | 'project';
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  thinking?: string;
  tools: ToolCard[];
  images?: MediaItem[];
  edits?: FileEdit[];
  plan?: string;
  streaming?: boolean;
  createdAt?: string;
  endedAt?: string;
  error?: TurnError;
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
}

export interface LoginView {
  url?: string;
  mode?: AuthUrlMode;
  label?: string;
}

export type DrawerId = 'sessions' | 'extensions' | 'history' | undefined;

export interface GrokSettings {
  cliPath: string;
  preferWorkspaceBinary: boolean;
  minCliVersion: string;
  permissionMode: 'ask' | 'auto' | 'acceptEdits';
  includeSelectionOnSend: boolean;
  alwaysApprove: boolean;
  locale: 'auto' | 'en' | 'zh-CN';
}

export const DEFAULT_SETTINGS: GrokSettings = {
  cliPath: '',
  preferWorkspaceBinary: false,
  minCliVersion: '0.1.0',
  permissionMode: 'ask',
  includeSelectionOnSend: true,
  alwaysApprove: false,
  locale: 'auto',
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
  currentSessionId?: string;
  restoringSession?: boolean;
  hideSessionPreview?: boolean;
  workspacePath?: string;
  locale?: 'en' | 'zh-CN';
  context?: ContextUsage;
  settings?: GrokSettings;
  settingsOpen?: boolean;
  settingsPage?: SettingsPage;
  rules?: RuleItem[];
  skills?: SkillItem[];
  apis?: ApiEndpoint[];
  mcps?: McpItem[];
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
  | { type: 'removeAttachment'; id: string }
  | { type: 'openFile'; path: string }
  | { type: 'openUrl'; url: string }
  | { type: 'setModel'; modelId: string }
  | { type: 'setMode'; modeId: string }
  | { type: 'setEffort'; level: string }
  | { type: 'installCli' }
  | { type: 'openDrawer'; drawer: 'sessions' | 'extensions' | 'history'; tab?: string }
  | { type: 'closeDrawer' }
  | { type: 'loadSession'; sessionId: string; cwd?: string }
  | { type: 'renameSession'; sessionId: string }
  | { type: 'deleteSession'; sessionId: string }
  | { type: 'rewindTo'; index: number }
  | { type: 'searchFiles'; query: string }
  | { type: 'pickFile'; path: string }
  | { type: 'copyLast' }
  | { type: 'copyText'; text: string }
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
  | { type: 'openTheme' }
  | { type: 'closeTheme' }
  | { type: 'setTheme'; primary: string; secondary: string; background?: string }
  | { type: 'openMcps' }
  | { type: 'closeMcps' }
  | { type: 'toggleMcp'; id: string }
  | {
      type: 'saveApi';
      id?: string;
      name: string;
      model: string;
      baseUrl: string;
      backend: ApiBackend;
      apiKey?: string;
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
