export type UiLocale = 'en' | 'zh-CN';

export function resolveLocale(
  setting: string | undefined,
  vscodeLanguage: string,
): UiLocale {
  const value = (setting ?? 'auto').trim();
  if (value === 'en') {
    return 'en';
  }
  if (value === 'zh-CN' || value === 'zh' || value === 'zh-cn') {
    return 'zh-CN';
  }
  const lang = vscodeLanguage.toLowerCase();
  if (lang === 'zh-cn' || lang === 'zh' || lang.startsWith('zh-')) {
    return 'zh-CN';
  }
  return 'en';
}

export const EN = {
  more: 'More',
  sessions: 'Sessions',
  newSession: 'New session',
  menuCompact: 'Compact context',
  menuExport: 'Export conversation',
  menuSettings: 'Settings',
  menuRestart: 'Restart agent',
  settingsTitle: 'Settings',
  settingsClose: 'Close',
  settingsUi: 'Interface',
  settingsLang: 'Language',
  settingsLangAuto: 'Auto',
  settingsLangEn: 'English',
  settingsLangZh: '简体中文',
  settingsCompact: 'Compact transcript',
  settingsCompactHint: 'Tighter spacing in the thread',
  settingsMultiline: 'Multiline composer',
  settingsMultilineHint: 'Enter inserts a newline. Send with Shift+Enter.',
  settingsTimestamps: 'Timestamps',
  settingsTimestampsHint: 'Keep the clock on finished turns',
  settingsAgent: 'Agent',
  settingsPermission: 'Tool permission',
  settingsPermissionAsk: 'Ask',
  settingsPermissionAuto: 'Auto',
  settingsAlways: 'Always approve',
  settingsAlwaysHint: 'Starts the agent with --always-approve. Restart to apply.',
  settingsSelection: 'Attach editor selection',
  settingsSelectionHint: 'Include the current selection with each send',
  settingsCli: 'CLI',
  settingsCliPath: 'Binary path',
  settingsCliPathHint: 'Leave empty to auto-detect.',
  settingsCliCurrent: 'Using {path}',
  settingsCliMissing: 'No grok binary found yet. Auto-detect runs on restart.',
  settingsPreferBin: 'Prefer workspace binary',
  settingsPreferBinHint: 'Use this repo’s target/release build when present',
  settingsMinVer: 'Minimum CLI version',
  settingsMinVerHint: 'Restart the agent after changing CLI settings',
  settingsAccount: 'Account',
  settingsSignedIn: 'Signed in as {name}',
  settingsSignedOut: 'Not signed in',
  settingsAgentVer: 'Agent {version}',
  settingsLogout: 'Sign out',
  settingsApiKey: 'API key',
  settingsRestart: 'Restart agent',
  settingsRestartHint: 'CLI path, workspace binary, and always-approve apply after restart.',
  settingsRules: 'Rules',
  settingsRulesHint: 'Import markdown or text files into ~/.grok/rules. Grok loads enabled .md files.',
  settingsRulesCount: '{n} rules',
  settingsRulesBack: 'Back',
  settingsRulesImport: 'Import .md / .txt',
  settingsRulesEmpty: 'No rules yet. Import a markdown or text file.',
  settingsRulesGlobal: 'Global · ~/.grok/rules',
  settingsRulesProject: 'Project · .grok/rules',
  settingsRulesOn: 'Enabled',
  settingsRulesOff: 'Disabled',
  settingsRulesDelete: 'Delete',
  settingsRulesDeleteConfirm: 'Delete rule {name}?',
  settingsRulesImported: 'Imported {n} rule(s). Restart the agent to apply.',
  settingsSkills: 'Skills',
  settingsSkillsHint: 'Import a zip or folder with SKILL.md into ~/.grok/skills.',
  settingsSkillsCount: '{n} skills',
  settingsSkillsImportZip: 'Import zip',
  settingsSkillsImportFolder: 'Import folder',
  settingsSkillsEmpty: 'No skills yet. Import a zip or a folder that contains SKILL.md.',
  settingsSkillsGlobal: 'Global · ~/.grok/skills',
  settingsSkillsProject: 'Project · .grok/skills',
  settingsSkillsOn: 'Enabled',
  settingsSkillsOff: 'Disabled',
  settingsSkillsDelete: 'Delete',
  settingsSkillsDeleteConfirm: 'Delete skill {name}?',
  settingsSkillsImported: 'Imported {n} skill(s). Restart the agent to apply.',
  drawerSessions: 'Sessions',
  drawerHistory: 'Prompt history',
  drawerClose: 'Close',
  sessionsEmpty: 'No saved sessions yet.',
  queued: 'Queued: {n}',
  removeAttach: 'Remove',
  attach: 'Attach',
  modeAsk: 'Ask',
  modePlan: 'Plan',
  modeAgent: 'Agent',
  switchModel: 'Switch model',
  switchEffort: 'Reasoning effort',
  busyLock: 'Stop the current turn to change this',
  stop: 'Stop',
  send: 'Send',
  fileSearchHint: 'Type to search workspace files',
  placeholderLogin: 'Sign in to start',
  placeholderQueue: 'Queue a follow-up…',
  placeholderAsk: 'Ask Grok to build, or type /',
  cliTitle: 'Install the Grok CLI',
  cliBody:
    'This extension talks to the local grok binary over ACP. Install it once, then sign in from here.',
  cliInstall: 'Install in terminal',
  cliReady: 'I already installed it',
  loginWaitTitle: 'Waiting for browser…',
  loginTitle: 'Sign in to Grok Build',
  loginWaitBody:
    'Complete sign-in in the page that just opened. You can reopen it or paste a code if the loopback redirect did not finish.',
  loginBody:
    'Opens auth.x.ai in your browser — the same login as the Grok CLI. SuperGrok, X Premium+, or an xAI API key.',
  loginDevice: 'Device login: confirm the code on that page.',
  loginReopen: 'Open browser again',
  cancel: 'Cancel',
  loginWith: 'Sign in with {label}',
  loginGrok: 'Sign in with Grok',
  pasteCode: 'Paste code if needed',
  submit: 'Submit',
  useApiKey: 'Use an API key instead',
  promptApiKey: 'Paste an xAI API key from console.x.ai',
  errorTitle: 'Something went wrong',
  retry: 'Retry',
  homeTitle: 'What are we building?',
  homeBody:
    'Grok can edit this workspace, run commands, and use your slash tools. / for commands, @ for files.',
  starter1: 'Explain how this repo is put together',
  starter2: 'Find bugs in the file I have open',
  starter3: 'Write tests for the last change',
  recent: 'Recent',
  you: 'You',
  grok: 'Grok',
  plan: 'Plan',
  thinking: 'Thinking',
  thinkingNow: 'Thinking…',
  elapsed: 'Took {time}',
  copy: 'Copy',
  copied: 'Copied',
  working: 'Working',
  editsTitle: '{n} changes',
  undo: 'Revert',
  review: 'Review',
  editsMore: '+{n} more',
  previewImage: 'Preview image',
  closePreview: 'Close preview',
  revertConfirm: 'Revert {n} files changed in this turn?',
  revertAction: 'Revert',
  revertDone: 'Reverted {n} files',
  revertNone: 'Nothing to revert for this turn',
  revertFailed: 'Could not revert {n} files',
  revertWorking: 'Reverting files…',
  reviewTitle: 'Review changes',
  reviewEmpty: 'No file changes to review',
  reviewDiff: '{name}: before ↔ current',
  reviewMissing: 'No before-image for {name}; opened the current file',
  diffFiles: '{n} files in this turn',
  diffSplit: 'Split',
  diffUnified: 'Stack',
  diffGap: '{n} quiet lines',
  diffOpen: 'Open',
  diffCreated: 'new',
  diffDeleted: 'gone',
  diffBefore: 'Before',
  diffAfter: 'After',
  ctxTitle: 'Context',
  ctxWaiting: 'Waiting for session usage',
  ctxFree: 'Free',
  ctxSystem: 'System prompt',
  ctxMessages: 'Messages',
  ctxTools: 'Tool definitions',
  ctxCompact: 'Auto-compact at {pct}%',
  untrustedTitle: 'This workspace is not trusted',
  untrustedBody: 'Trust the folder, then Grok Build can run the local agent.',
  startingTitle: 'Starting Grok…',
  startingBody: 'Connecting to the local grok agent.',
  restoringTitle: 'Restoring session…',
  restoringBody: 'Loading chat history and context for this conversation.',
  timeJustNow: 'just now',
  timeMinutes: '{n} min',
  timeHours: '{n}h',
  timeDays: '{n}d',
  effortXhigh: 'Extra high',
  effortHigh: 'High',
  effortMedium: 'Medium',
  effortLow: 'Low',
  imgGenerated: 'generated',
  toolRead: 'Read',
  toolEdit: 'Edit',
  toolWrite: 'Write',
  toolTerminal: 'Terminal',
  toolSearch: 'Search',
  toolDelete: 'Delete',
  toolGeneric: 'Tool',
} as const;

export type StringKey = keyof typeof EN;

export const ZH: Record<StringKey, string> = {
  more: '更多',
  sessions: '会话',
  newSession: '新会话',
  menuCompact: '压缩上下文',
  menuExport: '导出对话',
  menuSettings: '设置',
  menuRestart: '重启 Agent',
  settingsTitle: '设置',
  settingsClose: '关闭',
  settingsUi: '界面',
  settingsLang: '语言',
  settingsLangAuto: '自动',
  settingsLangEn: 'English',
  settingsLangZh: '简体中文',
  settingsCompact: '紧凑对话',
  settingsCompactHint: '缩小会话区间距',
  settingsMultiline: '多行输入',
  settingsMultilineHint: 'Enter 换行，Shift+Enter 发送',
  settingsTimestamps: '时间戳',
  settingsTimestampsHint: '在完成的回复旁保留时钟',
  settingsAgent: 'Agent',
  settingsPermission: '工具权限',
  settingsPermissionAsk: '询问',
  settingsPermissionAuto: '自动',
  settingsAlways: '始终批准',
  settingsAlwaysHint: '启动时带上 --always-approve。重启后生效。',
  settingsSelection: '附带编辑器选区',
  settingsSelectionHint: '发送时带上当前选中的代码',
  settingsCli: 'CLI',
  settingsCliPath: '可执行文件路径',
  settingsCliPathHint: '留空则自动检测。',
  settingsCliCurrent: '当前：{path}',
  settingsCliMissing: '尚未找到 grok 命令，重启后会重新检测。',
  settingsPreferBin: '优先使用仓库内二进制',
  settingsPreferBinHint: '若本仓库已编译，使用 target/release 构建',
  settingsMinVer: '最低 CLI 版本',
  settingsMinVerHint: '修改 CLI 相关选项后请重启 Agent',
  settingsAccount: '账户',
  settingsSignedIn: '已登录：{name}',
  settingsSignedOut: '未登录',
  settingsAgentVer: 'Agent {version}',
  settingsLogout: '退出登录',
  settingsApiKey: 'API 密钥',
  settingsRestart: '重启 Agent',
  settingsRestartHint: 'CLI 路径、仓库内二进制和始终批准会在重启后生效。',
  settingsRules: '规则',
  settingsRulesHint: '导入 Markdown 或文本文件到 ~/.grok/rules。Grok 会加载已启用的 .md。',
  settingsRulesCount: '{n} 条规则',
  settingsRulesBack: '返回',
  settingsRulesImport: '导入 .md / .txt',
  settingsRulesEmpty: '还没有规则。导入 markdown 或 txt 文件即可。',
  settingsRulesGlobal: '全局 · ~/.grok/rules',
  settingsRulesProject: '项目 · .grok/rules',
  settingsRulesOn: '已启用',
  settingsRulesOff: '已停用',
  settingsRulesDelete: '删除',
  settingsRulesDeleteConfirm: '删除规则 {name}？',
  settingsRulesImported: '已导入 {n} 条规则。重启 Agent 后生效。',
  settingsSkills: '技能',
  settingsSkillsHint: '把带 SKILL.md 的 zip 或文件夹导入到 ~/.grok/skills。',
  settingsSkillsCount: '{n} 个 skill',
  settingsSkillsImportZip: '导入 zip',
  settingsSkillsImportFolder: '导入文件夹',
  settingsSkillsEmpty: '还没有 skill。导入 zip，或选择包含 SKILL.md 的文件夹。',
  settingsSkillsGlobal: '全局 · ~/.grok/skills',
  settingsSkillsProject: '项目 · .grok/skills',
  settingsSkillsOn: '已启用',
  settingsSkillsOff: '已停用',
  settingsSkillsDelete: '删除',
  settingsSkillsDeleteConfirm: '删除 skill {name}？',
  settingsSkillsImported: '已导入 {n} 个 skill。重启 Agent 后生效。',
  drawerSessions: '会话',
  drawerHistory: '提示历史',
  drawerClose: '关闭',
  sessionsEmpty: '还没有保存的会话。',
  queued: '已排队：{n}',
  removeAttach: '移除',
  attach: '附加',
  modeAsk: '问答',
  modePlan: '计划',
  modeAgent: '代理',
  switchModel: '切换模型',
  switchEffort: '思考强度',
  busyLock: '请先中断当前任务再调整',
  stop: '停止',
  send: '发送',
  fileSearchHint: '输入以搜索工作区文件',
  placeholderLogin: '登录后开始',
  placeholderQueue: '排队下一条…',
  placeholderAsk: '让 Grok 开始构建，或输入 /',
  cliTitle: '安装 Grok CLI',
  cliBody: '此扩展通过 ACP 连接本机 grok 命令。安装一次后即可在此登录。',
  cliInstall: '在终端中安装',
  cliReady: '我已经装好了',
  loginWaitTitle: '等待浏览器…',
  loginTitle: '登录 Grok Build',
  loginWaitBody: '请在刚打开的页面完成登录。若回跳未完成，可重新打开或粘贴验证码。',
  loginBody: '在浏览器打开 auth.x.ai，与 grok login 相同。支持 SuperGrok、X Premium+ 或 xAI API 密钥。',
  loginDevice: '设备登录：请在该页面确认验证码。',
  loginReopen: '再次打开浏览器',
  cancel: '取消',
  loginWith: '使用 {label} 登录',
  loginGrok: '使用 Grok 登录',
  pasteCode: '需要时粘贴验证码',
  submit: '提交',
  useApiKey: '改用 API 密钥',
  promptApiKey: '粘贴来自 console.x.ai 的 xAI API 密钥',
  errorTitle: '出了点问题',
  retry: '重试',
  homeTitle: '要构建什么？',
  homeBody: 'Grok 可以编辑此工作区、运行命令，并使用斜杠工具。/ 调命令，@ 附加文件。',
  starter1: '解释这个仓库是怎么组织的',
  starter2: '检查我打开的文件里的问题',
  starter3: '给最近的改动写测试',
  recent: '最近',
  you: '你',
  grok: 'Grok',
  plan: '计划',
  thinking: '思考',
  thinkingNow: '思考中…',
  elapsed: '用时 {time}',
  copy: '复制',
  copied: '已复制',
  working: '正在处理',
  editsTitle: '{n} 处修改',
  undo: '还原',
  review: '审查',
  editsMore: '还有 {n} 个',
  previewImage: '预览图片',
  closePreview: '关闭预览',
  revertConfirm: '还原本轮更改的 {n} 个文件？',
  revertAction: '还原',
  revertDone: '已还原 {n} 个文件',
  revertNone: '这一轮没有可还原的文件',
  revertFailed: '{n} 个文件未能还原',
  revertWorking: '正在还原文件…',
  reviewTitle: '更改审查',
  reviewEmpty: '没有可审查的文件更改',
  reviewDiff: '{name}：更改前 ↔ 当前',
  reviewMissing: '{name} 没有更改前快照，已打开当前文件',
  diffFiles: '本轮 {n} 个文件',
  diffSplit: '并排',
  diffUnified: '合一',
  diffGap: '未改 {n} 行',
  diffOpen: '打开',
  diffCreated: '新建',
  diffDeleted: '已删',
  diffBefore: '更改前',
  diffAfter: '当前',
  ctxTitle: '上下文',
  ctxWaiting: '正在读取会话用量',
  ctxFree: '剩余',
  ctxSystem: '系统提示',
  ctxMessages: '对话',
  ctxTools: '工具定义',
  ctxCompact: '自动压缩于 {pct}%',
  untrustedTitle: '此工作区不受信任',
  untrustedBody: '先信任该文件夹，Grok Build 才能运行本地 agent。',
  startingTitle: '正在启动 Grok…',
  startingBody: '正在连接本机 grok agent。',
  restoringTitle: '正在恢复会话…',
  restoringBody: '正在加载该对话的聊天记录和上下文。',
  timeJustNow: '刚刚',
  timeMinutes: '{n} 分',
  timeHours: '{n} 小时',
  timeDays: '{n} 天',
  effortXhigh: '极高',
  effortHigh: '高',
  effortMedium: '中',
  effortLow: '低',
  imgGenerated: '生成的图片',
  toolRead: '阅读',
  toolEdit: '编辑',
  toolWrite: '写入',
  toolTerminal: '终端',
  toolSearch: '搜索',
  toolDelete: '删除',
  toolGeneric: '工具',
};

export function t(
  locale: UiLocale,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const table: Record<StringKey, string> = locale === 'zh-CN' ? ZH : EN;
  let out = table[key] ?? EN[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.replaceAll(`{${name}}`, String(value));
    }
  }
  return out;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatClock(locale: UiLocale, iso?: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (locale === 'zh-CN') {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${hh}:${mm}`;
  }
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${hh}:${mm}`;
}

export function formatRelativeTime(
  locale: UiLocale,
  iso?: string,
  now = Date.now(),
): string {
  if (!iso) {
    return '';
  }
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  const min = Math.max(0, Math.round((now - parsed) / 60000));
  if (min < 1) {
    return t(locale, 'timeJustNow');
  }
  if (min < 60) {
    return t(locale, 'timeMinutes', { n: min });
  }
  const hours = Math.round(min / 60);
  if (hours < 24) {
    return t(locale, 'timeHours', { n: hours });
  }
  return t(locale, 'timeDays', { n: Math.round(hours / 24) });
}

export function effortLabel(locale: UiLocale, effort?: string): string {
  switch (effort) {
    case 'xhigh':
      return t(locale, 'effortXhigh');
    case 'high':
      return t(locale, 'effortHigh');
    case 'medium':
      return t(locale, 'effortMedium');
    case 'low':
      return t(locale, 'effortLow');
    default:
      return '';
  }
}

export function toolKindLabel(locale: UiLocale, kind?: string): string {
  switch (kind) {
    case 'read':
      return t(locale, 'toolRead');
    case 'edit':
      return t(locale, 'toolEdit');
    case 'write':
      return t(locale, 'toolWrite');
    case 'execute':
    case 'terminal':
      return t(locale, 'toolTerminal');
    case 'search':
      return t(locale, 'toolSearch');
    case 'delete':
      return t(locale, 'toolDelete');
    default:
      return t(locale, 'toolGeneric');
  }
}
