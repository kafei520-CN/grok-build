"use strict";
(() => {
  // src/core/i18n/index.ts
  var EN = {
    more: "More",
    sessions: "Sessions",
    newSession: "New session",
    menuDashboard: "Dashboard",
    menuCompact: "Compact context",
    menuRewind: "Rewind turn",
    menuFork: "Fork session",
    menuExport: "Export conversation",
    menuSettings: "Settings",
    menuRestart: "Restart agent",
    settingsTitle: "Settings",
    settingsClose: "Close",
    settingsUi: "Interface",
    settingsLang: "Language",
    settingsLangAuto: "Auto",
    settingsLangEn: "English",
    settingsLangZh: "\u7B80\u4F53\u4E2D\u6587",
    settingsCompact: "Compact transcript",
    settingsCompactHint: "Tighter spacing in the thread",
    settingsMultiline: "Multiline composer",
    settingsMultilineHint: "Enter inserts a newline. Send with Shift+Enter.",
    settingsTimestamps: "Timestamps",
    settingsTimestampsHint: "Keep the clock on finished turns",
    settingsNotify: "Notification sound",
    settingsNotifyHint: "Play a chime when a turn finishes, or a lower tone if it is interrupted",
    settingsTermEncoding: "Terminal encoding",
    settingsTermEncodingHint: "How terminal tool bytes are decoded for display. Default UTF-8.",
    settingsTheme: "Theme",
    settingsThemeHint: "Colors, a frosted or solid floating panel, and an optional image behind the chat.",
    settingsRemote: "Remote access",
    settingsRemoteHint: "LAN is for a device on this Wi-Fi. Public gives the other person a browser URL. They do not install the plugin. Anyone with the pairing code can edit files and run commands.",
    settingsRemoteOn: "Allow LAN browsers",
    settingsRemoteOnHint: "Starts a TCP HTTP + WebSocket server on this machine. Pairing is required.",
    settingsRemoteLocal: "LAN",
    settingsRemoteLocalHint: "Listen on every interface. Phones and PCs on this Wi-Fi use the addresses below.",
    settingsRemotePublic: "Public",
    settingsRemotePublicHint: "Opens a public browser URL through the built-in relay. The other person only needs that address and the pairing code. One browser only.",
    settingsRemotePort: "Port",
    settingsRemoteCode: "Pairing code",
    settingsRemoteCodeHint: "The browser asks for this once. Anyone with the code can edit the workspace and run commands.",
    settingsRemoteAuth: "Pairing secret",
    settingsRemoteAuthHint: "Random makes a 6-digit code you can regenerate. Custom keeps the password you set on this machine.",
    settingsRemoteAuthRandom: "Random code",
    settingsRemoteAuthCustom: "Custom password",
    settingsRemoteCustomHint: "4\u201364 characters. Anyone with this password can edit files and run commands.",
    settingsRemoteCustomSave: "Save",
    settingsRemoteCustomNeed: "Set a password to use custom pairing.",
    settingsRemoteRegen: "New code",
    settingsRemoteUrls: "Addresses",
    settingsRemoteCopy: "Copy",
    settingsRemoteClients: "{n} browser(s) connected",
    settingsRemoteOff: "Stopped",
    settingsRemoteError: "Could not listen: {error}",
    settingsRemoteTunnel: "Do not skip the pairing code. Anyone who has one can edit files and run commands.",
    settingsRemotePublicUrl: "Public address",
    settingsRemotePublicUrlHint: "What you give people, for example http://YOUR_VPS:8787 or https://chat.example.com.",
    settingsRemotePublicUrlSave: "Save",
    settingsRemoteSeats: "Pairing codes",
    settingsRemoteSeat: "Person {n}",
    settingsRemoteSeatAdd: "Add person",
    settingsRemoteSeatRemove: "Remove",
    settingsRemoteBind: "Listening on {bind}:{port}",
    settingsRemoteSsh: "On this PC: ssh -N -R 0.0.0.0:{port}:127.0.0.1:{port} root@YOUR_VPS",
    settingsRemoteNavBoth: "LAN + public \xB7 {n} browser(s)",
    settingsRemoteNavLocal: "LAN \xB7 {n} browser(s)",
    settingsRemoteNavPublic: "Public \xB7 {n} browser(s)",
    settingsRemoteHost: "VPS address",
    settingsRemoteSshUser: "SSH user",
    settingsRemoteSshPort: "SSH port",
    settingsRemoteForwardPort: "Public port on the VPS",
    settingsRemoteForwardPortHint: "Leave empty to pick a free port in 20000\u201329999 so many plugins can share the relay. Set a port only if this VPS serves a single plugin.",
    settingsRemoteSetup: "Built-in public access is a browser URL. A custom VPS still uses SSH: put this computer\u2019s public key in authorized_keys and set GatewayPorts yes.",
    settingsRemoteBundled: "Send the address below. The other person opens it in a browser and enters the pairing code. No plugin, no OpenSSH.",
    settingsRemoteSshPub: "Tunnel public key for this PC",
    settingsRemoteSshPubHint: "Needed only for a custom VPS. Paste the line below into that server\u2019s authorized_keys.",
    settingsRemoteTunnelConnecting: "Opening the public browser URL\u2026",
    settingsRemoteTunnelUp: "Public URL is ready. Copy the address below.",
    settingsRemoteTunnelErrAuth: "This PC\u2019s tunnel key is not in the VPS authorized_keys. Copy the public key below, then turn public access on again.",
    settingsRemoteTunnelErrHostKey: "The VPS host key was not accepted. The plugin keeps its own known_hosts and does not use ~/.ssh.",
    settingsRemoteTunnelErrKeyFile: "The tunnel key could not be used. Install OpenSSH (Windows optional feature) and turn public access off then on.",
    settingsRemoteTunnelErrHost: "Could not resolve the VPS hostname.",
    settingsRemoteTunnelErrForward: "The VPS refused the listen port. Set GatewayPorts yes and restart sshd.",
    settingsRemoteTunnelErrNetwork: "Could not reach the relay. Check the IP, port, and cloud firewall.",
    settingsRemoteTunnelErrClosed: "Public link dropped. Retrying\u2026",
    settingsRemoteTunnelErrMissing: "Fill in the VPS address, then turn public access on.",
    settingsRemoteTunnelErrReject: "The relay rejected this plugin.",
    settingsRemoteTunnelErrRelay: "The relay is not answering. It must be running on the built-in host.",
    settingsRemoteRelay: "Public relay",
    settingsRemoteRelayHint: "Official needs nothing. Custom: IP or domain, plus the hostKey from that Grok Web server.",
    settingsRemoteRelayOfficial: "Official server",
    settingsRemoteRelayCustom: "Custom server",
    settingsRemoteRelayKey: "Relay key",
    settingsRemoteRelayKeyHint: "Copied from the Grok Web control panel.",
    settingsRemoteRelayPort: "Relay port",
    settingsRemoteRelayPortHint: "Not required to be 80. Official tries 8788 then 80 if you leave the default. Custom uses this port only.",
    settingsRemoteRelayPortMore: "Port (optional, default 8788)",
    settingsRemoteTunnelErrNeedKey: "Set the custom relay key from the Grok Web control panel.",
    themePresets: "Presets",
    themeCustom: "Custom",
    themePreview: "Preview",
    themePrimary: "Primary",
    themeSecondary: "Secondary",
    themeBackground: "Background",
    themeBackgroundAuto: "Match editor",
    themeReset: "Reset to Ice",
    themeFont: "Font",
    themeFontHint: "Import a TTF, OTF, or WOFF file. Size and tracking apply to the chat. With lock contrast on, text color stays auto.",
    themeFontPick: "Choose font",
    themeFontClear: "Default font",
    themeFontNone: "Editor font",
    themeFontFile: "Using {name}",
    themeFontSize: "Size",
    themeFontTracking: "Letter spacing",
    themeFontColor: "Text color",
    themeLockContrast: "Lock contrast",
    themeLockContrastHint: "Keep light or dark text from the background. Custom text color is ignored.",
    themeWallpaper: "Wallpaper",
    themeWallpaperHint: "A picture, or a looping video (mp4, webm). Open preview to place the center at the current window size. Gaps keep the background color.",
    themeWallpaperIcon: "Use icon",
    themeWallpaperPick: "Choose file",
    themeWallpaperImages: "Images",
    themeWallpaperVideos: "Videos",
    themeWallpaperClear: "Clear",
    themeWallpaperOpacity: "Opacity",
    themeWallpaperScale: "Zoom",
    themePreviewOpen: "Preview & center",
    themePreviewHint: "Click a point to put it at the center. Drag to pan.",
    themePreviewSize: "{w} \xD7 {h}",
    themePreviewDone: "Done",
    themePreviewCenter: "Center {x}%, {y}%",
    themeSurface: "Panel",
    themeSurfaceHint: "Background blur only changes the wallpaper. Component blur, highlight, and shadow apply to bubbles, cards, and menus.",
    themeSurfaceFlat: "Default",
    themeSurfaceGlass: "Liquid glass",
    themeSurfaceSolid: "Solid float",
    themeSurfaceEndfield: "Endfield",
    themeGlassOpacity: "Panel opacity",
    themeGlassBlur: "Background blur",
    themeChromeBlur: "Component blur",
    themeChromeGlass: "All components",
    themeChromeGlassHint: "Every bubble, button, and menu frosts the wallpaper in its own rectangle. Higher layers blur more.",
    themeChromeGlassOpacity: "Card opacity",
    themePresetIce: "Ice",
    themePresetAurora: "Aurora",
    themePresetViolet: "Violet",
    themePresetSunset: "Sunset",
    themePresetRose: "Rose",
    themePresetEmber: "Ember",
    themePresetEndfield: "Endfield",
    settingsAgent: "Agent",
    settingsPermission: "Tool permission",
    settingsPermissionAsk: "Ask",
    settingsPermissionEdits: "Accept edits",
    settingsPermissionAuto: "Auto",
    settingsAlways: "Always approve",
    settingsAlwaysHint: "Skip tool prompts on new and loaded sessions. Applies without restarting the agent.",
    settingsTerminal: "Use terminal / commands",
    settingsTerminalHint: "Allow slash commands, skills, and shell tools. Applies without restarting.",
    settingsTerminalOff: "Turn on \u201CUse terminal / commands\u201D in Settings to run this.",
    settingsSelection: "Attach editor selection",
    settingsSelectionHint: "Include the current selection with each send",
    settingsCli: "CLI",
    settingsCliPath: "Binary path",
    settingsCliPathHint: "Leave empty to auto-detect.",
    settingsCliCurrent: "Using {path}",
    settingsCliMissing: "No grok binary found yet. Auto-detect runs on restart.",
    settingsPreferBin: "Prefer workspace binary",
    settingsPreferBinHint: "Use this repo\u2019s target/release build when present",
    settingsMinVer: "Minimum CLI version",
    settingsMinVerHint: "Restart the agent after changing CLI settings",
    settingsAccount: "Account",
    settingsSignedIn: "Signed in as {name}",
    settingsSignedOut: "Not signed in",
    quotaWeeklyNamed: "Weekly {tier} limit",
    quotaMonthlyNamed: "Monthly {tier} limit",
    quotaWeekly: "Weekly limit",
    quotaMonthly: "Monthly limit",
    quotaNamed: "{tier} limit",
    quotaUsage: "Usage",
    quotaUsed: "{n}% used",
    quotaReset: "Resets {time}",
    quotaLoading: "Loading usage\u2026",
    settingsAgentVer: "Agent {version}",
    settingsLogout: "Sign out",
    settingsApiKey: "API key",
    settingsApis: "API manager",
    settingsApisHint: "Official grok.com models appear here too. Toggle one off to hide it from the picker; official models cannot be deleted. Custom OpenAI / Anthropic endpoints can be added below. Grok does not add /v1 for you.",
    settingsApisOfficial: "Official",
    settingsApisCount: "{n} endpoints",
    settingsApisEmpty: "No custom endpoints yet.",
    settingsApisAdd: "Add endpoint",
    settingsApisEdit: "Edit endpoint",
    settingsApisName: "Display name",
    settingsApisModel: "Model ID",
    settingsApisUrl: "Base URL",
    settingsApisUrlHint: "API root only. Include /v1 yourself when the provider needs it, e.g. https://api.example.com/v1. Do not append /chat/completions, /responses, or /messages.",
    settingsApisUrlHintMessages: "Anthropic Messages. Grok appends /messages, so Claude-compatible hosts need /v1 in the base URL, e.g. https://api.example.com/v1.",
    settingsApisUrlPreview: "Grok will POST {url}",
    settingsApisMessagesUrlWarn: "This host has no path. Grok will call /messages, not /v1/messages. Add /v1 if the provider uses it.",
    settingsApisWindow: "Max context window",
    settingsApisWindowHint: "Tokens for auto-compact. 128k or 128000. Leave blank for 500k.",
    settingsApisWindowInvalid: "Enter a token count such as 128k or 128000.",
    settingsApisKey: "API key",
    settingsApisKeyKeep: "Leave blank to keep the current key",
    settingsApisProtocol: "Protocol",
    settingsApisChat: "Chat Completions",
    settingsApisResponses: "Responses",
    settingsApisMessages: "Messages",
    settingsApisSave: "Save",
    settingsApisCancel: "Cancel",
    settingsApisDelete: "Delete",
    settingsApisDeleteConfirm: "Delete endpoint {name}?",
    settingsApisSaved: "Saved. The model picker will update shortly.",
    settingsApisHasKey: "key saved",
    settingsApisOn: "Enabled",
    settingsApisOff: "Disabled",
    settingsApisUrlInvalid: "Enter an http(s) API root. Include /v1 yourself if the provider uses it.",
    settingsApisReloadFailed: "The agent did not reload models. The new endpoint was turned off so the session can recover.",
    settingsApisQuarantined: "Endpoint {name} was turned off because it broke the agent.",
    settingsRestart: "Restart agent",
    settingsRestartHint: "CLI path and workspace binary apply after restart.",
    settingsMcps: "MCP servers",
    settingsMcpsHint: "Toggle servers from ~/.grok/config.toml and managed connectors. Changes apply to the current session.",
    settingsMcpsCount: "{n} servers",
    settingsMcpsEmpty: "No MCP servers yet. Add them with grok mcp add, or in ~/.grok/config.toml.",
    settingsMcpsOn: "Enabled",
    settingsMcpsOff: "Disabled",
    settingsMcpsNeedSession: "Start a chat first, then toggle servers for this session.",
    settingsMcpsManaged: "Managed",
    settingsMcpsLocal: "Local",
    settingsMcpsTools: "{n} tools",
    settingsAgents: "Agents & personas",
    settingsAgentsHint: "Agent definitions set the next new session. Personas overlay subagents only.",
    settingsAgentsCount: "{n} agents",
    settingsAgentsEmpty: "No custom agents yet. Import a markdown file with YAML frontmatter.",
    settingsAgentsImport: "Import .md",
    settingsAgentsUse: "Use",
    settingsAgentsUsing: "Active",
    settingsAgentsBuiltin: "Built-in",
    settingsAgentsGlobal: "Global \xB7 ~/.grok/agents",
    settingsAgentsProject: "Project \xB7 .grok/agents",
    settingsAgentsApplied: "Agent {name} will apply on the next new session.",
    settingsAgentsDeleteConfirm: "Delete agent {name}?",
    settingsAgentsImported: "Imported {n} agent(s).",
    settingsAgentsTab: "Agents",
    settingsPersonas: "Personas",
    settingsPersonasHint: "Personas are behavioral overlays for subagents, not the primary session.",
    settingsPersonasCount: "{n} personas",
    settingsPersonasEmpty: "No personas yet. Import a .toml file into ~/.grok/personas.",
    settingsPersonasImport: "Import .toml",
    settingsPersonasGlobal: "Global \xB7 ~/.grok/personas",
    settingsPersonasProject: "Project \xB7 .grok/personas",
    settingsPersonasDeleteConfirm: "Delete persona {name}?",
    settingsPersonasImported: "Imported {n} persona(s).",
    settingsPersonasTab: "Personas",
    settingsRules: "Rules",
    settingsRulesHint: "Grok also loads ~/.claude/Claude.md and ~/.cursor instruction files. Disable those here if a closed ~/.grok/rules file still applies.",
    settingsRulesCount: "{n} rules",
    settingsRulesBack: "Back",
    settingsRulesImport: "Import .md / .txt",
    settingsRulesEmpty: "No rules yet. Import a markdown or text file.",
    settingsRulesGlobal: "Global \xB7 ~/.grok/rules",
    settingsRulesProject: "Project \xB7 .grok/rules",
    settingsRulesClaude: "Claude \xB7 ~/.claude",
    settingsRulesCursor: "Cursor \xB7 ~/.cursor",
    settingsRulesClaudeProject: "Project \xB7 .claude",
    settingsRulesCursorProject: "Project \xB7 .cursor",
    settingsRulesOn: "Enabled",
    settingsRulesOff: "Disabled",
    settingsRulesDelete: "Delete",
    settingsRulesDeleteConfirm: "Delete rule {name}?",
    settingsRulesImported: "Imported {n} rule(s).",
    settingsSkills: "Skills",
    settingsSkillsHint: "Import a zip or folder with SKILL.md into ~/.grok/skills.",
    settingsSkillsCount: "{n} skills",
    settingsSkillsImportZip: "Import zip",
    settingsSkillsImportFolder: "Import folder",
    settingsSkillsEmpty: "No skills yet. Import a zip or a folder that contains SKILL.md.",
    settingsSkillsGlobal: "Global \xB7 ~/.grok/skills",
    settingsSkillsProject: "Project \xB7 .grok/skills",
    settingsSkillsBundled: "Built-in \xB7 office",
    settingsSkillsOn: "Enabled",
    settingsSkillsOff: "Disabled",
    settingsSkillsDelete: "Delete",
    settingsSkillsDeleteConfirm: "Delete skill {name}?",
    settingsSkillsImported: "Imported {n} skill(s). Restart the agent to apply.",
    drawerSessions: "Sessions",
    drawerDashboard: "Dashboard",
    drawerHistory: "Prompt history",
    drawerClose: "Close",
    dashboardEmpty: "No live or recent sessions yet.",
    dashboardSubagents: "Running subagents",
    dashboardSessions: "Sessions",
    dashboardSwitch: "Switch",
    dashboardStop: "Stop",
    dashboardFork: "Fork",
    dashboardDispatch: "Dispatch",
    dashboardDispatchHint: "Send a task to the selected session",
    dashboardWorktree: "worktree",
    dashboardCurrent: "current",
    dashboardCancelSub: "Cancel",
    dashboardNoSub: "No running subagents.",
    activityWorking: "Working",
    activityIdle: "Idle",
    activityNeedsInput: "Needs input",
    activityDormant: "Dormant",
    activityCompleted: "Done",
    activityDead: "Dead",
    forkWorktreeQ: "Run this fork in an isolated git worktree?",
    forkWorktreeYes: "Yes, worktree",
    forkWorktreeYesHint: "Copy the repo so this branch cannot collide with the current tree",
    forkWorktreeNo: "No, same folder",
    forkWorktreeNoHint: "Keep using the current working directory",
    forkWorktreeFailed: "Could not create a git worktree for this fork.",
    forkNeedSession: "Start or restore a session before forking.",
    settingsWorktrees: "Worktrees",
    settingsWorktreesHint: "Apply an isolated git worktree back onto the main working tree, or remove it.",
    settingsWorktreesCount: "{n} worktrees",
    settingsWorktreesEmpty: "No grok worktrees yet. Fork a session with a worktree first.",
    settingsWorktreesApply: "Apply",
    settingsWorktreesRemove: "Remove",
    settingsWorktreesApplyOk: "Applied {n} file(s) onto the main tree.",
    settingsWorktreesApplyConflict: "Apply stopped with {n} conflict(s). Resolve them in git, then retry.",
    settingsWorktreesNeedSession: "Need a session id and worktree path to apply.",
    settingsWorktreesMerge: "Merge",
    settingsWorktreesMergeHint: "Three-way merge into the current working tree",
    settingsWorktreesOverwrite: "Overwrite",
    settingsWorktreesOverwriteHint: "Replace files in the current working tree",
    settingsWorktreesAlive: "Alive",
    settingsWorktreesDead: "Dead",
    settingsWorktreesRemoveConfirm: "Remove worktree {name}?",
    settingsWorktreesRemoved: "Worktree removed.",
    settingsExt: "Extensions",
    settingsExtHint: "Plugins, marketplace, hooks, and saved workflows.",
    settingsPlugins: "Plugins",
    settingsPluginsEmpty: "No plugins loaded in this session.",
    settingsPluginsDeleteConfirm: "Uninstall plugin {name}?",
    settingsMarketplace: "Marketplace",
    settingsMarketplaceEmpty: "No marketplace sources. Add one with grok plugin marketplace add.",
    settingsMarketplaceInstall: "Install",
    settingsMarketplaceInstalled: "Install started.",
    settingsMarketplaceRefresh: "Refresh catalogs",
    settingsHooks: "Hooks",
    settingsHooksEmpty: "No hooks loaded.",
    settingsWorkflows: "Workflows",
    settingsWorkflowsEmpty: "No saved workflows. Add .rhai files under .grok/workflows.",
    settingsWorkflowsRun: "Run",
    settingsNeedSession: "Start a chat first, then manage this list.",
    settingsMemory: "Memory",
    settingsMemoryHint: "Long-term notes in ~/.grok/memory. Flush copies this session into MEMORY.md.",
    settingsMemoryEmpty: "No MEMORY.md files yet. Use /remember, or flush a session.",
    settingsMemoryGlobal: "Global",
    settingsMemoryWorkspace: "Workspace",
    settingsMemoryFlush: "Flush session",
    settingsMemoryFlushed: "Session knowledge flushed to memory.",
    settingsMemoryNeedSession: "Start a chat first, then flush memory.",
    drawerTasks: "Tasks",
    drawerPlan: "Plan",
    tasksEmpty: "No background tasks in this session.",
    tasksKill: "Kill",
    tasksRunning: "Running",
    tasksDone: "Done",
    planEmpty: "No plan in this session yet. Use /plan first.",
    stepsTitle: "Steps",
    stepsCount: "{done}/{n}",
    dashboardApply: "Apply",
    askTitle: "Grok has a question",
    askOther: "Other",
    askOtherHint: "Type your own answer",
    askSubmit: "Send",
    askMultiHint: "Select one or more, then send",
    copyOutsideWorkspace: "Copy-to-file stays inside the workspace.",
    askQuestionOf: "Question {n} of {total}",
    planReadyTitle: "Plan ready",
    planReadyEmpty: "No plan was written. Approve to start implementing, or add notes.",
    planExecute: "Implement",
    planExecuteHint: "Leave plan mode and start implementing in Agent mode.",
    planDecline: "Not now",
    planDeclineHint: "Keep plan mode. Do not implement. Wait for your next message.",
    planSupplement: "Revise",
    planSupplementHint: "What should change in this plan?",
    askHint: "More detail",
    sessionsEmpty: "No saved sessions yet.",
    sessionsLive: "Running",
    sessionsDone: "Unread",
    sessionsStopped: "Interrupted",
    sessionsModeList: "Traditional",
    sessionsModeWorkspace: "Workspace",
    sessionsCurrentWorkspace: "Current",
    sessionsUnknownWorkspace: "Unknown folder",
    sessionsGroupCount: "{n} chats",
    sessionsRename: "Rename",
    sessionsDelete: "Delete",
    sessionsDeleteConfirm: "Delete session {name}?",
    sessionsRenamed: "Renamed to {name}.",
    forkFailed: "Could not fork this session.",
    compacting: "Compacting context\u2026",
    compactLive: "Compacting our conversation so we can keep chatting\u2026",
    compactAutoLive: "Auto-compacting context",
    compactDone: "Compacted conversation history.",
    compactAutoDone: "Context was full; compacted older history and kept recent turns.",
    compactFailed: "Could not compact context",
    compactBusy: "Wait for the current reply to finish.",
    rewindEmpty: "No rewind points in this session.",
    rewindPick: "Rewind to turn",
    rewindConfirm: "Rewind to this turn? Later messages and file edits after this point will be discarded.",
    rewindAction: "Rewind",
    queued: "Queued: {n}",
    queueSendNow: "Send now",
    removeAttach: "Remove",
    attach: "Attach",
    attachPick: "Photos and files",
    dropFiles: "Drop files or folders to attach",
    quoteInChat: "Quote in chat",
    modeAsk: "Ask",
    modePlan: "Plan",
    modeAgent: "Agent",
    modeGoal: "Goal",
    goalPause: "Pause goal",
    goalResume: "Resume goal",
    goalClose: "End goal",
    goalStartHint: "Describe the goal and press send to start",
    goalFollowHint: "Send extra instructions for the running goal",
    goalResumeHint: "Press send to resume, or add a note first",
    goalRunningHint: "Goal is running \u2014 stop pauses it",
    goalBarRunning: "Running goal",
    goalBarPaused: "Paused goal",
    goalEdit: "Edit goal",
    goalEditHint: "Edit the goal and press send",
    goalStatus: "Goal status",
    switchMode: "Switch mode",
    switchModel: "Switch model",
    switchEffort: "Reasoning effort",
    busyLock: "Stop the current turn to change this",
    stop: "Stop",
    send: "Send",
    fileSearchHint: "Type to search workspace files",
    placeholderLogin: "Sign in to start",
    placeholderQueue: "Queue a follow-up\u2026",
    placeholderAsk: "Ask Grok to build, or type /",
    cliTitle: "Install the Grok CLI",
    cliBody: "This extension talks to the local grok binary over ACP. Install it once, then sign in from here.",
    cliInstall: "Install in terminal",
    cliReady: "I already installed it",
    loginWaitTitle: "Waiting for browser\u2026",
    loginTitle: "Sign in to Grok Build",
    loginWaitBody: "Complete sign-in in the page that just opened. You can reopen it or paste a code if the loopback redirect did not finish.",
    loginBody: "Opens auth.x.ai in your browser \u2014 the same login as the Grok CLI. SuperGrok, X Premium+, or an xAI API key.",
    loginDevice: "Device login: confirm the code on that page.",
    loginReopen: "Open browser again",
    cancel: "Cancel",
    permDetails: "Details",
    permAllowOnce: "Allow",
    permAllowAlways: "Always allow",
    permAllowEditsSession: "Allow edits",
    permReject: "Deny",
    permRejectTell: "Deny",
    askModeBlocked: "Ask mode cannot edit files. Switch to Agent to continue this change.",
    askModeSwitch: "Switch to Agent and allow",
    askModeStay: "Stay in Ask",
    loginWith: "Sign in with {label}",
    loginGrok: "Sign in with Grok",
    loginSkip: "Skip",
    pasteCode: "Paste code if needed",
    submit: "Submit",
    useApiKey: "Use an API key instead",
    promptApiKey: "Paste an xAI API key from console.x.ai",
    errorTitle: "Something went wrong",
    turnError: "Request failed",
    agentExited: "Grok agent stopped. Reconnecting\u2026",
    agentExitedGiveUp: "Grok agent stopped. Restart it from the menu.",
    turnRetrying: "Retrying {n}/{max}",
    errorCode: "Code {code}",
    errorUntrustedCert: "The host certificate is not trusted. Install the relay CA in the OS store, or set GROK_EXTRA_CA_BUNDLE to its PEM file.",
    errorApiKeyRejected: "This endpoint rejected the credentials. For a custom API, check the key in API manager. Sign-in / login is only for grok.com.",
    errorRelayAfterOfficialLogin: "Official grok.com login was refreshed, but this relay still returned 401. Put the relay API key in API manager \u2014 the grok.com session token is not valid there.",
    retry: "Retry",
    homeTitle: "What are we building?",
    homeBody: "Grok can edit this workspace, run commands, and use your slash tools. / for commands, @ for files.",
    starter1: "Explain how this repo is put together",
    starter2: "Find bugs in the file I have open",
    starter3: "Write tests for the last change",
    recent: "Recent",
    you: "You",
    grok: "Grok",
    connRttHint: "Round-trip delay to this session",
    plan: "Plan",
    thinking: "Thinking",
    thinkingNow: "Thinking\u2026",
    heroOpen: "Open",
    heroReveal: "Show in folder",
    heroOpenBrowser: "Open in browser",
    heroOpenImage: "Open image",
    heroKindWeb: "Web page",
    heroKindImage: "Image",
    heroKindFolder: "Folder",
    heroKindApp: "Application",
    heroKindFile: "File",
    toolOk: "Done",
    toolFailed: "Failed",
    toolRunning: "Running",
    taskStarted: "Started",
    taskCompleted: "Completed",
    elapsed: "Took {time}",
    elapsedLive: "Elapsed {time}",
    copy: "Copy",
    copied: "Copied",
    working: "Working",
    editsTitle: "{n} changes",
    liveEdits: "Editing {n} files",
    jumpBottom: "Jump to latest",
    jumpBottomLive: "Working \u2014 jump to latest",
    undo: "Revert",
    review: "Review",
    editsMore: "+{n} more",
    previewImage: "Preview image",
    closePreview: "Close preview",
    revertConfirm: "Revert {n} files changed in this turn?",
    revertAction: "Revert",
    revertDone: "Reverted {n} files",
    revertNone: "Nothing to revert for this turn",
    revertFailed: "Could not revert {n} files",
    revertWorking: "Reverting files\u2026",
    grokDiff: "Grok Diff",
    reviewTitle: "Review changes",
    reviewEmpty: "No file changes to review",
    reviewDiff: "{name}: before \u2194 current",
    reviewMissing: "No before-image for {name}; opened the current file",
    remoteFileTooLarge: "This file is too large to open in the browser.",
    remoteFileBinary: "Binary file. It opened in the IDE if one is attached.",
    remoteFileMissing: "Could not read that file.",
    remoteViewSidebar: "Sidebar",
    remoteViewWorkspace: "Workspace",
    wsSearch: "Filter files",
    wsEmpty: "No files in this workspace index.",
    wsOpenHint: "Open a file to read it. Small edits only; larger changes belong on the computer or in chat.",
    wsSave: "Save",
    wsSaved: "Saved {name} from the browser.",
    wsReview: "Review",
    wsTellAi: "Ask Grok",
    wsTellAiHint: "Describe a larger change. Grok will do it in the sidebar.",
    wsConflict: "This file changed on the computer. Reload it before saving.",
    wsTooBig: "This file is too large for the browser.",
    wsTooMany: "That edit is too large for the browser.",
    wsBinary: "Binary files cannot be edited in the browser.",
    wsMissing: "Could not read or write that file from the browser.",
    wsBusy: "Grok is already editing this file. Wait or ask in chat.",
    wsTruncated: "Index stopped at {n} files. Filter to narrow it.",
    wsNeedComputer: "That change is too large. Edit it on the computer, or ask Grok in chat.",
    wsDirty: "Unsaved",
    wsDiscard: "Discard unsaved edits in the browser?",
    wsBack: "Files",
    wsExplorer: "Explorer",
    wsOpenEditors: "Open Editors",
    wsCloseTab: "Close",
    wsNewFile: "New File",
    wsNewFolder: "New Folder",
    wsRename: "Rename",
    wsDelete: "Delete",
    wsNewFileName: "File name",
    wsNewFolderName: "Folder name",
    wsRenameName: "New name",
    wsDeleteConfirm: "Delete {name}?",
    wsEditor: "Editor",
    wsFold: "Collapse",
    wsUnfold: "Expand",
    diffFiles: "{n} files in this turn",
    diffSplit: "Split",
    diffUnified: "Stack",
    diffGap: "{n} quiet lines",
    diffMore: "+{n} more lines",
    diffOpen: "Open",
    diffCreated: "new",
    diffDeleted: "gone",
    diffBefore: "Before",
    diffAfter: "After",
    ctxTitle: "Context",
    ctxWaiting: "Waiting for session usage",
    ctxFree: "Free",
    ctxSystem: "System prompt",
    ctxMessages: "Messages",
    ctxTools: "Tool definitions",
    ctxCompact: "Auto-compact at {pct}%",
    untrustedTitle: "This workspace is not trusted",
    untrustedBody: "Trust the folder, then Grok Build can run the local agent.",
    startingTitle: "Starting Grok\u2026",
    startingBody: "Connecting to the local grok agent.",
    restoringTitle: "Restoring session\u2026",
    restoringBody: "Loading chat history and context for this conversation.",
    timeJustNow: "just now",
    timeMinutes: "{n} min",
    timeHours: "{n}h",
    timeDays: "{n}d",
    effortXhigh: "Extra high",
    effortMax: "Max",
    effortHigh: "High",
    effortMedium: "Medium",
    effortLow: "Low",
    imgGenerated: "generated",
    toolRead: "Read",
    toolEdit: "Edit",
    toolWrite: "Write",
    toolTerminal: "Terminal",
    toolSearch: "Search",
    toolDelete: "Delete",
    toolCompact: "Compact",
    toolGeneric: "Tool",
    termRun: "Run output",
    termIdle: "Waiting for output",
    cronTitle: "Scheduled tasks",
    cronHint: "Send a prompt while the app is running. Missed runs are skipped.",
    cronNew: "New task",
    cronList: "Tasks",
    cronEmpty: "No scheduled tasks yet.",
    cronTitleField: "Name",
    cronPrompt: "Prompt",
    cronWhen: "Schedule",
    cronOnce: "Once",
    cronDaily: "Every day",
    cronWeekly: "Every week",
    cronInterval: "Every interval",
    cronAt: "Date and time",
    cronTime: "Time",
    cronWeekday: "Weekday",
    cronEvery: "Repeat",
    cronSave: "Save task",
    cronRunNow: "Run now",
    cronDelete: "Delete",
    cronPaused: "Paused",
    cronNoNext: "No next run",
    cronNext: "Next {at}",
    cronOnceAt: "Once at {at}",
    cronDailyAt: "Daily at {at}",
    cronWeeklyAt: "{day} at {at}",
    cronEveryLabel: "Every {every}",
    cronEvery15m: "15 minutes",
    cronEvery1h: "1 hour",
    cronEvery6h: "6 hours",
    cronEvery12h: "12 hours",
    cronEvery1d: "1 day",
    cronSun: "Sunday",
    cronMon: "Monday",
    cronTue: "Tuesday",
    cronWed: "Wednesday",
    cronThu: "Thursday",
    cronFri: "Friday",
    cronSat: "Saturday",
    cronEnabledCount: "{n} on",
    cronFired: "Scheduled: {title}"
  };
  var ZH = {
    more: "\u66F4\u591A",
    sessions: "\u4F1A\u8BDD",
    newSession: "\u65B0\u4F1A\u8BDD",
    menuDashboard: "\u63A7\u5236\u53F0",
    menuCompact: "\u538B\u7F29\u4E0A\u4E0B\u6587",
    menuRewind: "\u56DE\u9000\u56DE\u5408",
    menuFork: "\u5206\u53C9\u4F1A\u8BDD",
    menuExport: "\u5BFC\u51FA\u5BF9\u8BDD",
    menuSettings: "\u8BBE\u7F6E",
    menuRestart: "\u91CD\u542F Agent",
    settingsTitle: "\u8BBE\u7F6E",
    settingsClose: "\u5173\u95ED",
    settingsUi: "\u754C\u9762",
    settingsLang: "\u8BED\u8A00",
    settingsLangAuto: "\u81EA\u52A8",
    settingsLangEn: "English",
    settingsLangZh: "\u7B80\u4F53\u4E2D\u6587",
    settingsCompact: "\u7D27\u51D1\u5BF9\u8BDD",
    settingsCompactHint: "\u7F29\u5C0F\u4F1A\u8BDD\u533A\u95F4\u8DDD",
    settingsMultiline: "\u591A\u884C\u8F93\u5165",
    settingsMultilineHint: "Enter \u6362\u884C\uFF0CShift+Enter \u53D1\u9001",
    settingsTimestamps: "\u65F6\u95F4\u6233",
    settingsTimestampsHint: "\u5728\u5B8C\u6210\u7684\u56DE\u590D\u65C1\u4FDD\u7559\u65F6\u949F",
    settingsNotify: "\u63D0\u793A\u97F3",
    settingsNotifyHint: "\u4EFB\u52A1\u5B8C\u6210\u65F6\u64AD\u653E\u63D0\u793A\u97F3\uFF0C\u610F\u5916\u4E2D\u65AD\u65F6\u64AD\u653E\u8F83\u4F4E\u7684\u97F3\u8C03",
    settingsTermEncoding: "\u7EC8\u7AEF\u8F93\u51FA\u7F16\u7801",
    settingsTermEncodingHint: "\u5C06\u7EC8\u7AEF\u5DE5\u5177\u7684\u5B57\u8282\u8F93\u51FA\u6309\u6B64\u7F16\u7801\u663E\u793A\u3002\u9ED8\u8BA4 UTF-8\u3002\u4E2D\u6587 Windows \u53EF\u6539\u6210 GBK\u3002",
    settingsTheme: "\u4E3B\u9898",
    settingsThemeHint: "\u4E3B\u8272\u3001\u526F\u8272\u3001\u80CC\u666F\u8272\uFF0C\u4EE5\u53CA\u6BDB\u73BB\u7483 / \u7EAF\u8272\u60AC\u6D6E\u9762\u677F\u3002\u53EF\u9009\u56FE\u7247\u94FA\u5728\u5BF9\u8BDD\u6846\u540E\u9762\u3002",
    settingsRemote: "\u8FDC\u7A0B\u8BBF\u95EE",
    settingsRemoteHint: "\u672C\u5730\u7ED9\u540C\u4E00 Wi-Fi \u4E0A\u7684\u8BBE\u5907\u3002\u516C\u7F51\u8BA9\u5BF9\u65B9\u53EA\u7528\u6D4F\u89C8\u5668\u6253\u5F00\u5730\u5740\uFF0C\u4E0D\u7528\u88C5\u63D2\u4EF6\u3002\u6821\u9A8C\u7801\u4E0D\u8981\u5916\u4F20\uFF0C\u62FF\u5230\u7684\u4EBA\u53EF\u4EE5\u6539\u6587\u4EF6\u3001\u8DD1\u547D\u4EE4\u3002",
    settingsRemoteOn: "\u5141\u8BB8\u5C40\u57DF\u7F51\u6D4F\u89C8\u5668",
    settingsRemoteOnHint: "\u5728\u672C\u673A\u542F\u52A8 TCP \u4E0A\u7684 HTTP + WebSocket \u670D\u52A1\uFF0C\u8FDB\u5165\u524D\u5FC5\u987B\u8F93\u5165\u6821\u9A8C\u7801\u3002",
    settingsRemoteLocal: "\u672C\u5730\u5F00\u653E",
    settingsRemoteLocalHint: "\u76D1\u542C\u6240\u6709\u7F51\u5361\u3002\u540C\u4E00 Wi-Fi \u4E0A\u7684\u624B\u673A\u3001\u7535\u8111\u7528\u4E0B\u9762\u7684\u5730\u5740\u3002",
    settingsRemotePublic: "\u516C\u7F51\u5F00\u653E",
    settingsRemotePublicHint: "\u6253\u5F00\u540E\u5F97\u5230\u4E00\u4E2A\u516C\u7F51\u5730\u5740\u3002\u5BF9\u65B9\u7528\u6D4F\u89C8\u5668\u6253\u5F00\u5E76\u586B\u6821\u9A8C\u7801\u5373\u53EF\uFF0C\u4E0D\u7528\u88C5\u63D2\u4EF6\u3002\u53EA\u5141\u8BB8\u4E00\u4E2A\u6D4F\u89C8\u5668\u8FDE\u63A5\u3002",
    settingsRemotePort: "\u7AEF\u53E3",
    settingsRemoteCode: "\u6821\u9A8C\u7801",
    settingsRemoteCodeHint: "\u6D4F\u89C8\u5668\u7B2C\u4E00\u6B21\u6253\u5F00\u65F6\u8981\u586B\u3002\u62FF\u5230\u6821\u9A8C\u7801\u7684\u4EBA\u53EF\u4EE5\u6539\u5DE5\u4F5C\u533A\u6587\u4EF6\u5E76\u8FD0\u884C\u547D\u4EE4\u3002",
    settingsRemoteAuth: "\u914D\u5BF9\u65B9\u5F0F",
    settingsRemoteAuthHint: "\u968F\u673A\u6BCF\u6B21\u53EF\u6362\u4E00\u7EC4 6 \u4F4D\u6570\u5B57\u3002\u56FA\u5B9A\u5BC6\u7801\u7531\u4F60\u8BBE\u5B9A\uFF0C\u5173\u6389\u518D\u5F00\u4ECD\u7136\u6709\u6548\u3002",
    settingsRemoteAuthRandom: "\u968F\u673A\u5BC6\u94A5",
    settingsRemoteAuthCustom: "\u56FA\u5B9A\u5BC6\u7801",
    settingsRemoteCustomHint: "4\u201364 \u4E2A\u5B57\u7B26\u3002\u62FF\u5230\u5BC6\u7801\u7684\u4EBA\u53EF\u4EE5\u6539\u6587\u4EF6\u3001\u8DD1\u547D\u4EE4\u3002",
    settingsRemoteCustomSave: "\u4FDD\u5B58",
    settingsRemoteCustomNeed: "\u8BF7\u5148\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u518D\u4F7F\u7528\u56FA\u5B9A\u5BC6\u7801\u914D\u5BF9\u3002",
    settingsRemoteRegen: "\u6362\u4E00\u4E2A",
    settingsRemoteUrls: "\u5730\u5740",
    settingsRemoteCopy: "\u590D\u5236",
    settingsRemoteClients: "\u5DF2\u8FDE\u63A5 {n} \u4E2A\u6D4F\u89C8\u5668",
    settingsRemoteOff: "\u672A\u5F00\u542F",
    settingsRemoteError: "\u76D1\u542C\u5931\u8D25\uFF1A{error}",
    settingsRemoteTunnel: "\u4E0D\u8981\u8DF3\u8FC7\u6821\u9A8C\u7801\u3002\u62FF\u5230\u7801\u7684\u4EBA\u53EF\u4EE5\u6539\u6587\u4EF6\u3001\u8DD1\u547D\u4EE4\u3002",
    settingsRemotePublicUrl: "\u516C\u7F51\u5730\u5740",
    settingsRemotePublicUrlHint: "\u53D1\u7ED9\u522B\u4EBA\u7684\u5730\u5740\uFF0C\u4F8B\u5982 http://\u4F60\u7684\u670D\u52A1\u5668:8787 \u6216 https://chat.example.com\u3002",
    settingsRemotePublicUrlSave: "\u4FDD\u5B58",
    settingsRemoteSeats: "\u6821\u9A8C\u7801",
    settingsRemoteSeat: "\u6210\u5458 {n}",
    settingsRemoteSeatAdd: "\u52A0\u4E00\u4E2A\u4EBA",
    settingsRemoteSeatRemove: "\u79FB\u9664",
    settingsRemoteBind: "\u672C\u673A\u76D1\u542C {bind}:{port}",
    settingsRemoteSsh: "\u5728\u8FD9\u53F0\u7535\u8111\uFF1Assh -N -R 0.0.0.0:{port}:127.0.0.1:{port} root@\u4F60\u7684\u670D\u52A1\u5668",
    settingsRemoteNavBoth: "\u672C\u5730+\u516C\u7F51 \xB7 {n} \u4E2A\u6D4F\u89C8\u5668",
    settingsRemoteNavLocal: "\u672C\u5730 \xB7 {n} \u4E2A\u6D4F\u89C8\u5668",
    settingsRemoteNavPublic: "\u516C\u7F51 \xB7 {n} \u4E2A\u6D4F\u89C8\u5668",
    settingsRemoteHost: "\u670D\u52A1\u5668\u5730\u5740",
    settingsRemoteSshUser: "SSH \u7528\u6237",
    settingsRemoteSshPort: "SSH \u7AEF\u53E3",
    settingsRemoteForwardPort: "\u670D\u52A1\u5668\u4E0A\u7684\u516C\u7F51\u7AEF\u53E3",
    settingsRemoteForwardPortHint: "\u7559\u7A7A\u5219\u5728 20000\u201329999 \u81EA\u52A8\u5360\u4E00\u4E2A\u7A7A\u95F2\u7AEF\u53E3\uFF0C\u5F88\u591A\u5957\u63D2\u4EF6\u53EF\u4EE5\u540C\u65F6\u8D70\u8FD9\u53F0\u4E2D\u8F6C\u3002\u53EA\u6709\u4E00\u5957\u63D2\u4EF6\u65F6\u624D\u586B\u56FA\u5B9A\u7AEF\u53E3\u3002",
    settingsRemoteSetup: "\u5185\u7F6E\u516C\u7F51\u662F\u6D4F\u89C8\u5668\u5730\u5740\u3002\u53EA\u6709\u6539\u7528\u81EA\u5DF1\u7684\u670D\u52A1\u5668\u65F6\uFF0C\u624D\u8D70 SSH\uFF1A\u628A\u4E0B\u9762\u7684\u516C\u94A5\u653E\u8FDB authorized_keys\uFF0C\u5E76\u8BBE GatewayPorts yes\u3002",
    settingsRemoteBundled: "\u628A\u4E0B\u9762\u7684\u5730\u5740\u53D1\u7ED9\u5BF9\u65B9\u3002\u5BF9\u65B9\u7528\u6D4F\u89C8\u5668\u6253\u5F00\uFF0C\u586B\u6821\u9A8C\u7801\u5373\u53EF\u3002\u4E0D\u7528\u88C5\u63D2\u4EF6\uFF0C\u4E0D\u7528 OpenSSH\u3002",
    settingsRemoteSshPub: "\u8FD9\u53F0\u7535\u8111\u7684\u96A7\u9053\u516C\u94A5",
    settingsRemoteSshPubHint: "\u53EA\u6709\u81EA\u5B9A\u4E49\u670D\u52A1\u5668\u624D\u9700\u8981\u3002\u628A\u4E0B\u9762\u6574\u884C\u8D34\u8FDB\u90A3\u53F0\u670D\u52A1\u5668\u7684 authorized_keys\u3002",
    settingsRemoteTunnelConnecting: "\u6B63\u5728\u6253\u5F00\u516C\u7F51\u5730\u5740\u2026",
    settingsRemoteTunnelUp: "\u516C\u7F51\u5730\u5740\u5DF2\u5C31\u7EEA\u3002\u628A\u4E0B\u9762\u7684\u5730\u5740\u53D1\u7ED9\u5BF9\u65B9\u3002",
    settingsRemoteTunnelErrAuth: "\u670D\u52A1\u5668\u8FD8\u4E0D\u8BA4\u8FD9\u53F0\u7535\u8111\u7684\u96A7\u9053\u516C\u94A5\u3002\u8BF7\u628A\u4E0B\u9762\u7684\u516C\u94A5\u8FFD\u52A0\u5230 authorized_keys\uFF0C\u518D\u6253\u5F00\u516C\u7F51\u3002",
    settingsRemoteTunnelErrHostKey: "\u670D\u52A1\u5668\u4E3B\u673A\u5BC6\u94A5\u672A\u88AB\u63A5\u53D7\u3002\u63D2\u4EF6\u4F7F\u7528\u81EA\u5DF1\u7684 known_hosts\uFF0C\u4E0D\u8BFB ~/.ssh\u3002",
    settingsRemoteTunnelErrKeyFile: "\u96A7\u9053\u5BC6\u94A5\u65E0\u6CD5\u4F7F\u7528\u3002\u8BF7\u5B89\u88C5 OpenSSH\uFF08Windows \u53EF\u9009\u529F\u80FD\uFF09\uFF0C\u7136\u540E\u5173\u6389\u518D\u6253\u5F00\u516C\u7F51\u3002",
    settingsRemoteTunnelErrHost: "\u670D\u52A1\u5668\u57DF\u540D\u89E3\u6790\u5931\u8D25\u3002",
    settingsRemoteTunnelErrForward: "\u670D\u52A1\u5668\u4E0D\u8BA9\u76D1\u542C\u8BE5\u7AEF\u53E3\u3002\u8BF7\u8BBE GatewayPorts yes \u5E76\u91CD\u542F sshd\u3002",
    settingsRemoteTunnelErrNetwork: "\u8FDE\u4E0D\u4E0A\u4E2D\u7EE7\u3002\u68C0\u67E5 IP\u3001\u7AEF\u53E3\u548C\u4E91\u9632\u706B\u5899\u3002",
    settingsRemoteTunnelErrClosed: "\u516C\u7F51\u65AD\u4E86\uFF0C\u6B63\u5728\u91CD\u8FDE\u2026",
    settingsRemoteTunnelErrMissing: "\u5148\u586B\u670D\u52A1\u5668\u5730\u5740\uFF0C\u518D\u6253\u5F00\u516C\u7F51\u3002",
    settingsRemoteTunnelErrReject: "\u4E2D\u7EE7\u62D2\u7EDD\u4E86\u8FD9\u5957\u63D2\u4EF6\u3002",
    settingsRemoteTunnelErrRelay: "\u4E2D\u7EE7\u6CA1\u6709\u56DE\u5E94\u3002\u9700\u8981\u5728\u5185\u7F6E\u670D\u52A1\u5668\u4E0A\u8FD0\u884C relay\u3002",
    settingsRemoteRelay: "\u516C\u7F51\u4E2D\u8F6C",
    settingsRemoteRelayHint: "\u5B98\u65B9\u4E0D\u7528\u586B\u4EFB\u4F55\u4E1C\u897F\u3002\u81EA\u5B9A\u4E49\u53EA\u586B IP \u6216\u57DF\u540D\uFF0C\u4EE5\u53CA\u63A7\u5236\u9762\u677F\u91CC\u7684\u4E2D\u8F6C\u5BC6\u94A5\u3002",
    settingsRemoteRelayOfficial: "\u5B98\u65B9\u670D\u52A1\u5668",
    settingsRemoteRelayCustom: "\u81EA\u5B9A\u4E49\u670D\u52A1\u5668",
    settingsRemoteRelayKey: "\u4E2D\u8F6C\u5BC6\u94A5",
    settingsRemoteRelayKeyHint: "\u4ECE Grok Web \u63A7\u5236\u9762\u677F\u590D\u5236\u3002",
    settingsRemoteRelayPort: "\u4E2D\u8F6C\u7AEF\u53E3",
    settingsRemoteRelayPortHint: "\u4E0D\u5FC5\u662F 80\u3002\u5B98\u65B9\u9ED8\u8BA4\u5148\u8FDE 8788\uFF0C\u8FDE\u4E0D\u4E0A\u518D\u8BD5 80\u3002\u81EA\u5B9A\u4E49\u53EA\u8FDE\u4F60\u586B\u7684\u7AEF\u53E3\u3002",
    settingsRemoteRelayPortMore: "\u7AEF\u53E3\uFF08\u9009\u586B\uFF0C\u9ED8\u8BA4 8788\uFF09",
    settingsRemoteTunnelErrNeedKey: "\u8BF7\u586B\u5199 Grok Web \u63A7\u5236\u9762\u677F\u91CC\u7684\u81EA\u5B9A\u4E49\u4E2D\u8F6C\u5BC6\u94A5\u3002",
    themePresets: "\u9884\u8BBE\u8272\u8C03",
    themeCustom: "\u81EA\u5B9A\u4E49",
    themePreview: "\u9884\u89C8",
    themePrimary: "\u4E3B\u8272\u8C03",
    themeSecondary: "\u526F\u8272\u8C03",
    themeBackground: "\u80CC\u666F\u8272",
    themeBackgroundAuto: "\u8DDF\u968F\u7F16\u8F91\u5668",
    themeReset: "\u6062\u590D\u51B0\u84DD",
    themeFont: "\u5B57\u4F53",
    themeFontHint: "\u53EF\u5BFC\u5165 ttf\u3001otf\u3001woff\u3002\u5B57\u53F7\u548C\u5B57\u8DDD\u4F5C\u7528\u4E8E\u804A\u5929\u754C\u9762\u3002\u5F00\u542F\u56FA\u5B9A\u53CD\u5DEE\u8272\u65F6\uFF0C\u81EA\u5B9A\u4E49\u5B57\u8272\u4E0D\u751F\u6548\u3002",
    themeFontPick: "\u5BFC\u5165\u5B57\u4F53",
    themeFontClear: "\u9ED8\u8BA4\u5B57\u4F53",
    themeFontNone: "\u8DDF\u968F\u7F16\u8F91\u5668",
    themeFontFile: "\u5F53\u524D\uFF1A{name}",
    themeFontSize: "\u5B57\u53F7",
    themeFontTracking: "\u5B57\u95F4\u8DDD",
    themeFontColor: "\u6587\u5B57\u989C\u8272",
    themeLockContrast: "\u56FA\u5B9A\u53CD\u5DEE\u8272",
    themeLockContrastHint: "\u6309\u80CC\u666F\u81EA\u52A8\u9009\u6D45\u8272\u6216\u6DF1\u8272\u5B57\uFF0C\u81EA\u5B9A\u4E49\u5B57\u8272\u4E0D\u751F\u6548\u3002",
    themeWallpaper: "\u80CC\u666F\u56FE",
    themeWallpaperHint: "\u53EF\u7528\u56FE\u7247\u6216\u5FAA\u73AF\u89C6\u9891\uFF08mp4\u3001webm\uFF09\u3002\u6253\u5F00\u9884\u89C8\uFF0C\u6309\u5F53\u524D\u7A97\u53E3\u5927\u5C0F\u9009\u62E9\u4E2D\u5FC3\u4F4D\u7F6E\u3002\u7559\u767D\u4ECD\u663E\u793A\u80CC\u666F\u8272\u3002",
    themeWallpaperIcon: "\u4F7F\u7528\u56FE\u6807",
    themeWallpaperPick: "\u9009\u62E9\u6587\u4EF6",
    themeWallpaperImages: "\u56FE\u7247",
    themeWallpaperVideos: "\u89C6\u9891",
    themeWallpaperClear: "\u6E05\u9664",
    themeWallpaperOpacity: "\u4E0D\u900F\u660E\u5EA6",
    themeWallpaperScale: "\u7F29\u653E",
    themePreviewOpen: "\u9884\u89C8\u5E76\u9009\u62E9\u4E2D\u5FC3",
    themePreviewHint: "\u70B9\u51FB\u67D0\u5904\u5C06\u5176\u653E\u5230\u89C6\u7A97\u4E2D\u5FC3\uFF0C\u62D6\u52A8\u5E73\u79FB\u3002",
    themePreviewSize: "{w} \xD7 {h}",
    themePreviewDone: "\u5B8C\u6210",
    themePreviewCenter: "\u4E2D\u5FC3 {x}%, {y}%",
    themeSurface: "\u9762\u677F",
    themeSurfaceHint: "\u80CC\u666F\u6A21\u7CCA\u53EA\u8C03\u58C1\u7EB8\u3002\u7EC4\u4EF6\u6A21\u7CCA\u3001\u9AD8\u5149\u548C\u9634\u5F71\u4F5C\u7528\u5728\u6C14\u6CE1\u3001\u5361\u7247\u3001\u83DC\u5355\u4E0A\u3002",
    themeSurfaceFlat: "\u9ED8\u8BA4",
    themeSurfaceGlass: "\u6DB2\u6001\u73BB\u7483",
    themeSurfaceSolid: "\u7EAF\u8272\u60AC\u6D6E",
    themeSurfaceEndfield: "\u7EC8\u672B\u5730",
    themeGlassOpacity: "\u80CC\u666F\u677F\u900F\u660E\u5EA6",
    themeGlassBlur: "\u80CC\u666F\u6A21\u7CCA\u5EA6",
    themeChromeBlur: "\u7EC4\u4EF6\u6A21\u7CCA\u5EA6",
    themeChromeGlass: "\u5168\u90E8\u7EC4\u4EF6",
    themeChromeGlassHint: "\u6BCF\u4E2A\u6C14\u6CE1\u3001\u6309\u94AE\u3001\u83DC\u5355\u90FD\u5728\u81EA\u5DF1\u7684\u8303\u56F4\u5185\u7CCA\u58C1\u7EB8\u3002\u5C42\u7EA7\u8D8A\u9AD8\u8D8A\u7CCA\u3002",
    themeChromeGlassOpacity: "\u5361\u7247\u4E0D\u900F\u660E\u5EA6",
    themePresetIce: "\u51B0\u84DD",
    themePresetAurora: "\u6781\u5149",
    themePresetViolet: "\u7D2B\u6676",
    themePresetSunset: "\u65E5\u843D",
    themePresetRose: "\u73AB\u7470",
    themePresetEmber: "\u7425\u73C0",
    themePresetEndfield: "\u7EC8\u672B\u5730",
    settingsAgent: "Agent",
    settingsPermission: "\u5DE5\u5177\u6743\u9650",
    settingsPermissionAsk: "\u8BE2\u95EE",
    settingsPermissionEdits: "\u63A5\u53D7\u7F16\u8F91",
    settingsPermissionAuto: "\u81EA\u52A8",
    settingsAlways: "\u59CB\u7EC8\u6279\u51C6",
    settingsAlwaysHint: "\u65B0\u5EFA\u6216\u52A0\u8F7D\u4F1A\u8BDD\u65F6\u8DF3\u8FC7\u5DE5\u5177\u786E\u8BA4\uFF0C\u4E0D\u5FC5\u91CD\u542F Agent\u3002",
    settingsTerminal: "\u4F7F\u7528\u7EC8\u7AEF / \u6307\u4EE4",
    settingsTerminalHint: "\u5141\u8BB8\u659C\u6760\u6307\u4EE4\u3001\u6280\u80FD\u548C\u7EC8\u7AEF\u547D\u4EE4\u3002\u4E0D\u5FC5\u91CD\u542F\u5373\u53EF\u751F\u6548\u3002",
    settingsTerminalOff: "\u8BF7\u5148\u5728\u8BBE\u7F6E\u4E2D\u6253\u5F00\u300C\u4F7F\u7528\u7EC8\u7AEF / \u6307\u4EE4\u300D\u3002",
    settingsSelection: "\u9644\u5E26\u7F16\u8F91\u5668\u9009\u533A",
    settingsSelectionHint: "\u53D1\u9001\u65F6\u5E26\u4E0A\u5F53\u524D\u9009\u4E2D\u7684\u4EE3\u7801",
    settingsCli: "CLI",
    settingsCliPath: "\u53EF\u6267\u884C\u6587\u4EF6\u8DEF\u5F84",
    settingsCliPathHint: "\u7559\u7A7A\u5219\u81EA\u52A8\u68C0\u6D4B\u3002",
    settingsCliCurrent: "\u5F53\u524D\uFF1A{path}",
    settingsCliMissing: "\u5C1A\u672A\u627E\u5230 grok \u547D\u4EE4\uFF0C\u91CD\u542F\u540E\u4F1A\u91CD\u65B0\u68C0\u6D4B\u3002",
    settingsPreferBin: "\u4F18\u5148\u4F7F\u7528\u4ED3\u5E93\u5185\u4E8C\u8FDB\u5236",
    settingsPreferBinHint: "\u82E5\u672C\u4ED3\u5E93\u5DF2\u7F16\u8BD1\uFF0C\u4F7F\u7528 target/release \u6784\u5EFA",
    settingsMinVer: "\u6700\u4F4E CLI \u7248\u672C",
    settingsMinVerHint: "\u4FEE\u6539 CLI \u76F8\u5173\u9009\u9879\u540E\u8BF7\u91CD\u542F Agent",
    settingsAccount: "\u8D26\u6237",
    settingsSignedIn: "\u5DF2\u767B\u5F55\uFF1A{name}",
    settingsSignedOut: "\u672A\u767B\u5F55",
    quotaWeeklyNamed: "\u6BCF\u5468 {tier} \u9650\u989D",
    quotaMonthlyNamed: "\u6BCF\u6708 {tier} \u9650\u989D",
    quotaWeekly: "\u6BCF\u5468\u9650\u989D",
    quotaMonthly: "\u6BCF\u6708\u9650\u989D",
    quotaNamed: "{tier} \u9650\u989D",
    quotaUsage: "\u7528\u91CF",
    quotaUsed: "{n}% \u5DF2\u4F7F\u7528",
    quotaReset: "\u91CD\u7F6E {time}",
    quotaLoading: "\u6B63\u5728\u83B7\u53D6\u7528\u91CF\u2026",
    settingsAgentVer: "Agent {version}",
    settingsLogout: "\u9000\u51FA\u767B\u5F55",
    settingsApiKey: "API \u5BC6\u94A5",
    settingsApis: "API \u7BA1\u7406",
    settingsApisHint: "\u5B98\u65B9 grok.com \u6A21\u578B\u4E5F\u4F1A\u5217\u5728\u8FD9\u91CC\u3002\u5173\u6389\u5F00\u5173\u5373\u4ECE\u6A21\u578B\u4E0B\u62C9\u5217\u8868\u9690\u85CF\uFF0C\u5B98\u65B9\u6A21\u578B\u4E0D\u80FD\u5220\u9664\u3002\u4E0B\u65B9\u53EF\u6DFB\u52A0 OpenAI / Anthropic \u517C\u5BB9\u7AEF\u70B9\u3002\u9700\u8981 /v1 \u65F6\u8BF7\u81EA\u5DF1\u5199\u5728\u5730\u5740\u91CC\u3002",
    settingsApisOfficial: "\u5B98\u65B9",
    settingsApisCount: "{n} \u4E2A\u7AEF\u70B9",
    settingsApisEmpty: "\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u7AEF\u70B9\u3002",
    settingsApisAdd: "\u6DFB\u52A0\u7AEF\u70B9",
    settingsApisEdit: "\u7F16\u8F91\u7AEF\u70B9",
    settingsApisName: "\u663E\u793A\u540D",
    settingsApisModel: "\u8BF7\u6C42\u6A21\u578B ID",
    settingsApisUrl: "Base URL",
    settingsApisUrlHint: "\u53EA\u586B\u63A5\u53E3\u6839\u5730\u5740\u3002\u9700\u8981 /v1 \u65F6\u8BF7\u81EA\u5DF1\u52A0\u4E0A\uFF0C\u4F8B\u5982 https://api.example.com/v1\u3002\u4E0D\u8981\u5E26 /chat/completions\u3001/responses \u6216 /messages\u3002",
    settingsApisUrlHintMessages: "Messages \u662F Anthropic \u534F\u8BAE\u3002Grok \u4F1A\u5728\u5730\u5740\u540E\u8FFD\u52A0 /messages\uFF0C\u6240\u4EE5 Claude \u517C\u5BB9\u63A5\u53E3\u8981\u628A /v1 \u5199\u8FDB Base URL\uFF0C\u4F8B\u5982 https://api.example.com/v1\u3002",
    settingsApisUrlPreview: "\u5B9E\u9645\u8BF7\u6C42\uFF1A{url}",
    settingsApisMessagesUrlWarn: "\u5F53\u524D\u5730\u5740\u6CA1\u6709\u8DEF\u5F84\u3002Grok \u4F1A\u8BF7\u6C42 /messages\uFF0C\u800C\u4E0D\u662F /v1/messages\u3002\u5982\u679C\u670D\u52A1\u5546\u8D70 Anthropic \u534F\u8BAE\uFF0C\u8BF7\u8865\u4E0A /v1\u3002",
    settingsApisWindow: "\u6700\u5927\u4E0A\u4E0B\u6587\u7A97\u53E3",
    settingsApisWindowHint: "\u7528\u4E8E\u81EA\u52A8\u538B\u7F29\u7684 token \u6570\u3002\u53EF\u5199 128k \u6216 128000\u3002\u7559\u7A7A\u5219\u6309 500k\u3002",
    settingsApisWindowInvalid: "\u8BF7\u586B\u5199 token \u6570\uFF0C\u4F8B\u5982 128k \u6216 128000\u3002",
    settingsApisKey: "API Key",
    settingsApisKeyKeep: "\u7559\u7A7A\u5219\u4FDD\u7559\u539F\u5BC6\u94A5",
    settingsApisProtocol: "\u8BF7\u6C42\u534F\u8BAE",
    settingsApisChat: "Chat Completions",
    settingsApisResponses: "Responses",
    settingsApisMessages: "Messages",
    settingsApisSave: "\u4FDD\u5B58",
    settingsApisCancel: "\u53D6\u6D88",
    settingsApisDelete: "\u5220\u9664",
    settingsApisDeleteConfirm: "\u5220\u9664\u7AEF\u70B9 {name}\uFF1F",
    settingsApisSaved: "\u5DF2\u4FDD\u5B58\u3002\u6A21\u578B\u5217\u8868\u5373\u5C06\u81EA\u52A8\u66F4\u65B0\u3002",
    settingsApisHasKey: "\u5DF2\u4FDD\u5B58\u5BC6\u94A5",
    settingsApisOn: "\u5DF2\u542F\u7528",
    settingsApisOff: "\u5DF2\u505C\u7528",
    settingsApisUrlInvalid: "\u8BF7\u586B\u5199 http(s) \u63A5\u53E3\u6839\u5730\u5740\u3002\u9700\u8981 /v1 \u65F6\u8BF7\u81EA\u5DF1\u52A0\u4E0A\u3002",
    settingsApisReloadFailed: "\u6A21\u578B\u5217\u8868\u5237\u65B0\u5931\u8D25\uFF0C\u5DF2\u5173\u95ED\u8BE5\u7AEF\u70B9\u4EE5\u514D\u5361\u4F4F\u4EE3\u7406\u3002",
    settingsApisQuarantined: "\u7AEF\u70B9 {name} \u5BFC\u81F4\u4EE3\u7406\u5F02\u5E38\uFF0C\u5DF2\u81EA\u52A8\u5173\u95ED\u3002",
    settingsRestart: "\u91CD\u542F Agent",
    settingsRestartHint: "CLI \u8DEF\u5F84\u548C\u4ED3\u5E93\u5185\u4E8C\u8FDB\u5236\u4F1A\u5728\u91CD\u542F\u540E\u751F\u6548\u3002",
    settingsMcps: "MCP \u670D\u52A1\u5668",
    settingsMcpsHint: "\u5F00\u5173 ~/.grok/config.toml \u548C\u6258\u7BA1\u8FDE\u63A5\u5668\u91CC\u7684 MCP\u3002\u5BF9\u5F53\u524D\u4F1A\u8BDD\u751F\u6548\u3002",
    settingsMcpsCount: "{n} \u4E2A\u670D\u52A1\u5668",
    settingsMcpsEmpty: "\u8FD8\u6CA1\u6709 MCP \u670D\u52A1\u5668\u3002\u7528 grok mcp add\uFF0C\u6216\u5199\u5165 ~/.grok/config.toml\u3002",
    settingsMcpsOn: "\u5DF2\u542F\u7528",
    settingsMcpsOff: "\u5DF2\u505C\u7528",
    settingsMcpsNeedSession: "\u5148\u5F00\u59CB\u4E00\u573A\u5BF9\u8BDD\uFF0C\u518D\u5F00\u5173\u5F53\u524D\u4F1A\u8BDD\u7684 MCP\u3002",
    settingsMcpsManaged: "\u6258\u7BA1",
    settingsMcpsLocal: "\u672C\u5730",
    settingsMcpsTools: "{n} \u4E2A\u5DE5\u5177",
    settingsAgents: "Agent \u4E0E Persona",
    settingsAgentsHint: "Agent \u5B9A\u4E49\u4F5C\u7528\u4E8E\u4E0B\u4E00\u6B21\u65B0\u4F1A\u8BDD\u3002Persona \u53EA\u53E0\u52A0\u5728\u5B50 Agent \u4E0A\u3002",
    settingsAgentsCount: "{n} \u4E2A Agent",
    settingsAgentsEmpty: "\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49 Agent\u3002\u5BFC\u5165\u5E26 YAML frontmatter \u7684 markdown \u5373\u53EF\u3002",
    settingsAgentsImport: "\u5BFC\u5165 .md",
    settingsAgentsUse: "\u4F7F\u7528",
    settingsAgentsUsing: "\u5F53\u524D",
    settingsAgentsBuiltin: "\u5185\u7F6E",
    settingsAgentsGlobal: "\u5168\u5C40 \xB7 ~/.grok/agents",
    settingsAgentsProject: "\u9879\u76EE \xB7 .grok/agents",
    settingsAgentsApplied: "Agent {name} \u4F1A\u5728\u4E0B\u4E00\u6B21\u65B0\u4F1A\u8BDD\u751F\u6548\u3002",
    settingsAgentsDeleteConfirm: "\u5220\u9664 Agent {name}\uFF1F",
    settingsAgentsImported: "\u5DF2\u5BFC\u5165 {n} \u4E2A Agent\u3002",
    settingsAgentsTab: "Agents",
    settingsPersonas: "Personas",
    settingsPersonasHint: "Persona \u662F\u5B50 Agent \u7684\u884C\u4E3A\u53E0\u52A0\uFF0C\u4E0D\u4F1A\u5207\u6362\u4E3B\u4F1A\u8BDD\u3002",
    settingsPersonasCount: "{n} \u4E2A Persona",
    settingsPersonasEmpty: "\u8FD8\u6CA1\u6709 Persona\u3002\u5BFC\u5165 .toml \u5230 ~/.grok/personas\u3002",
    settingsPersonasImport: "\u5BFC\u5165 .toml",
    settingsPersonasGlobal: "\u5168\u5C40 \xB7 ~/.grok/personas",
    settingsPersonasProject: "\u9879\u76EE \xB7 .grok/personas",
    settingsPersonasDeleteConfirm: "\u5220\u9664 Persona {name}\uFF1F",
    settingsPersonasImported: "\u5DF2\u5BFC\u5165 {n} \u4E2A Persona\u3002",
    settingsPersonasTab: "Personas",
    settingsRules: "\u89C4\u5219",
    settingsRulesHint: "Grok \u9ED8\u8BA4\u8FD8\u4F1A\u8BFB\u53D6 ~/.claude/Claude.md \u548C Cursor \u6307\u4EE4\u6587\u4EF6\u3002\u82E5 ~/.grok/rules \u5DF2\u5173\u95ED\u4ECD\u751F\u6548\uFF0C\u8BF7\u5728\u8FD9\u91CC\u5173\u6389\u5BF9\u5E94\u526F\u672C\u3002",
    settingsRulesCount: "{n} \u6761\u89C4\u5219",
    settingsRulesBack: "\u8FD4\u56DE",
    settingsRulesImport: "\u5BFC\u5165 .md / .txt",
    settingsRulesEmpty: "\u8FD8\u6CA1\u6709\u89C4\u5219\u3002\u5BFC\u5165 markdown \u6216 txt \u6587\u4EF6\u5373\u53EF\u3002",
    settingsRulesGlobal: "\u5168\u5C40 \xB7 ~/.grok/rules",
    settingsRulesProject: "\u9879\u76EE \xB7 .grok/rules",
    settingsRulesClaude: "Claude \xB7 ~/.claude",
    settingsRulesCursor: "Cursor \xB7 ~/.cursor",
    settingsRulesClaudeProject: "\u9879\u76EE \xB7 .claude",
    settingsRulesCursorProject: "\u9879\u76EE \xB7 .cursor",
    settingsRulesOn: "\u5DF2\u542F\u7528",
    settingsRulesOff: "\u5DF2\u505C\u7528",
    settingsRulesDelete: "\u5220\u9664",
    settingsRulesDeleteConfirm: "\u5220\u9664\u89C4\u5219 {name}\uFF1F",
    settingsRulesImported: "\u5DF2\u5BFC\u5165 {n} \u6761\u89C4\u5219\u3002",
    settingsSkills: "\u6280\u80FD",
    settingsSkillsHint: "\u628A\u5E26 SKILL.md \u7684 zip \u6216\u6587\u4EF6\u5939\u5BFC\u5165\u5230 ~/.grok/skills\u3002",
    settingsSkillsCount: "{n} \u4E2A skill",
    settingsSkillsImportZip: "\u5BFC\u5165 zip",
    settingsSkillsImportFolder: "\u5BFC\u5165\u6587\u4EF6\u5939",
    settingsSkillsEmpty: "\u8FD8\u6CA1\u6709 skill\u3002\u5BFC\u5165 zip\uFF0C\u6216\u9009\u62E9\u5305\u542B SKILL.md \u7684\u6587\u4EF6\u5939\u3002",
    settingsSkillsGlobal: "\u5168\u5C40 \xB7 ~/.grok/skills",
    settingsSkillsProject: "\u9879\u76EE \xB7 .grok/skills",
    settingsSkillsBundled: "\u5185\u7F6E \xB7 \u529E\u516C\u6587\u6863",
    settingsSkillsOn: "\u5DF2\u542F\u7528",
    settingsSkillsOff: "\u5DF2\u505C\u7528",
    settingsSkillsDelete: "\u5220\u9664",
    settingsSkillsDeleteConfirm: "\u5220\u9664 skill {name}\uFF1F",
    settingsSkillsImported: "\u5DF2\u5BFC\u5165 {n} \u4E2A skill\u3002\u91CD\u542F Agent \u540E\u751F\u6548\u3002",
    drawerSessions: "\u4F1A\u8BDD",
    drawerDashboard: "\u63A7\u5236\u53F0",
    drawerHistory: "\u63D0\u793A\u5386\u53F2",
    drawerClose: "\u5173\u95ED",
    dashboardEmpty: "\u8FD8\u6CA1\u6709\u8FDB\u884C\u4E2D\u6216\u6700\u8FD1\u7684\u4F1A\u8BDD\u3002",
    dashboardSubagents: "\u8FD0\u884C\u4E2D\u7684\u5B50 Agent",
    dashboardSessions: "\u4F1A\u8BDD",
    dashboardSwitch: "\u5207\u6362",
    dashboardStop: "\u505C\u6B62",
    dashboardFork: "\u5206\u53C9",
    dashboardDispatch: "\u6D3E\u53D1",
    dashboardDispatchHint: "\u5411\u9009\u4E2D\u7684\u4F1A\u8BDD\u53D1\u9001\u4EFB\u52A1",
    dashboardWorktree: "worktree",
    dashboardCurrent: "\u5F53\u524D",
    dashboardCancelSub: "\u53D6\u6D88",
    dashboardNoSub: "\u6CA1\u6709\u8FD0\u884C\u4E2D\u7684\u5B50 Agent\u3002",
    activityWorking: "\u5DE5\u4F5C\u4E2D",
    activityIdle: "\u7A7A\u95F2",
    activityNeedsInput: "\u7B49\u5F85\u8F93\u5165",
    activityDormant: "\u4F11\u7720",
    activityCompleted: "\u5B8C\u6210",
    activityDead: "\u5DF2\u7ED3\u675F",
    forkWorktreeQ: "\u8981\u5728\u9694\u79BB\u7684 git worktree \u4E2D\u5206\u53C9\u5417\uFF1F",
    forkWorktreeYes: "\u662F\uFF0C\u4F7F\u7528 worktree",
    forkWorktreeYesHint: "\u590D\u5236\u4ED3\u5E93\uFF0C\u907F\u514D\u548C\u5F53\u524D\u5DE5\u4F5C\u533A\u4E92\u76F8\u8986\u76D6",
    forkWorktreeNo: "\u5426\uFF0C\u540C\u4E00\u76EE\u5F55",
    forkWorktreeNoHint: "\u7EE7\u7EED\u4F7F\u7528\u5F53\u524D\u5DE5\u4F5C\u76EE\u5F55",
    forkWorktreeFailed: "\u65E0\u6CD5\u4E3A\u8FD9\u6B21\u5206\u53C9\u521B\u5EFA git worktree\u3002",
    forkNeedSession: "\u8BF7\u5148\u5F00\u59CB\u6216\u6062\u590D\u4E00\u4E2A\u4F1A\u8BDD\u518D\u5206\u53C9\u3002",
    settingsWorktrees: "Worktree",
    settingsWorktreesHint: "\u628A\u9694\u79BB git worktree \u7684\u6539\u52A8\u5408\u56DE\u4E3B\u5DE5\u4F5C\u533A\uFF0C\u6216\u5220\u9664\u8BE5 worktree\u3002",
    settingsWorktreesCount: "{n} \u4E2A worktree",
    settingsWorktreesEmpty: "\u8FD8\u6CA1\u6709 grok worktree\u3002\u5148\u7528\u5206\u53C9\u5E76\u9009\u62E9\u9694\u79BB worktree\u3002",
    settingsWorktreesApply: "\u5408\u56DE",
    settingsWorktreesRemove: "\u5220\u9664",
    settingsWorktreesApplyOk: "\u5DF2\u5408\u56DE {n} \u4E2A\u6587\u4EF6\u5230\u4E3B\u5DE5\u4F5C\u533A\u3002",
    settingsWorktreesApplyConflict: "\u5408\u56DE\u9047\u5230 {n} \u5904\u51B2\u7A81\uFF0C\u8BF7\u5728 git \u91CC\u89E3\u51B3\u540E\u518D\u8BD5\u3002",
    settingsWorktreesNeedSession: "\u5408\u56DE\u9700\u8981\u4F1A\u8BDD ID \u548C worktree \u8DEF\u5F84\u3002",
    settingsWorktreesMerge: "\u5408\u5E76",
    settingsWorktreesMergeHint: "\u4E09\u8DEF\u5408\u5E76\u8FDB\u5F53\u524D\u5DE5\u4F5C\u533A",
    settingsWorktreesOverwrite: "\u8986\u76D6",
    settingsWorktreesOverwriteHint: "\u7528 worktree \u6587\u4EF6\u66FF\u6362\u5F53\u524D\u5DE5\u4F5C\u533A",
    settingsWorktreesAlive: "\u6709\u6548",
    settingsWorktreesDead: "\u5DF2\u5931\u6548",
    settingsWorktreesRemoveConfirm: "\u5220\u9664 worktree {name}\uFF1F",
    settingsWorktreesRemoved: "\u5DF2\u5220\u9664 worktree\u3002",
    settingsExt: "\u6269\u5C55",
    settingsExtHint: "\u63D2\u4EF6\u3001\u5E02\u573A\u3001Hooks \u548C\u5DF2\u4FDD\u5B58\u7684 workflow\u3002",
    settingsPlugins: "\u63D2\u4EF6",
    settingsPluginsEmpty: "\u5F53\u524D\u4F1A\u8BDD\u6CA1\u6709\u52A0\u8F7D\u63D2\u4EF6\u3002",
    settingsPluginsDeleteConfirm: "\u5378\u8F7D\u63D2\u4EF6 {name}\uFF1F",
    settingsMarketplace: "\u5E02\u573A",
    settingsMarketplaceEmpty: "\u8FD8\u6CA1\u6709\u5E02\u573A\u6E90\u3002\u7528 grok plugin marketplace add \u6DFB\u52A0\u3002",
    settingsMarketplaceInstall: "\u5B89\u88C5",
    settingsMarketplaceInstalled: "\u5DF2\u5F00\u59CB\u5B89\u88C5\u3002",
    settingsMarketplaceRefresh: "\u5237\u65B0\u76EE\u5F55",
    settingsHooks: "Hooks",
    settingsHooksEmpty: "\u6CA1\u6709 Hook\u3002",
    settingsWorkflows: "Workflows",
    settingsWorkflowsEmpty: "\u6CA1\u6709\u5DF2\u4FDD\u5B58\u7684 workflow\u3002\u628A .rhai \u653E\u5230 .grok/workflows\u3002",
    settingsWorkflowsRun: "\u8FD0\u884C",
    settingsNeedSession: "\u5148\u5F00\u59CB\u4E00\u573A\u5BF9\u8BDD\uFF0C\u518D\u7BA1\u7406\u8FD9\u4E2A\u5217\u8868\u3002",
    settingsMemory: "\u8BB0\u5FC6",
    settingsMemoryHint: "\u957F\u671F\u7B14\u8BB0\u5728 ~/.grok/memory\u3002Flush \u4F1A\u628A\u5F53\u524D\u4F1A\u8BDD\u5199\u5165 MEMORY.md\u3002",
    settingsMemoryEmpty: "\u8FD8\u6CA1\u6709 MEMORY.md\u3002\u7528 /remember\uFF0C\u6216 flush \u4E00\u573A\u4F1A\u8BDD\u3002",
    settingsMemoryGlobal: "\u5168\u5C40",
    settingsMemoryWorkspace: "\u5DE5\u4F5C\u533A",
    settingsMemoryFlush: "Flush \u4F1A\u8BDD",
    settingsMemoryFlushed: "\u5DF2\u628A\u4F1A\u8BDD\u77E5\u8BC6\u5199\u5165\u8BB0\u5FC6\u3002",
    settingsMemoryNeedSession: "\u5148\u5F00\u59CB\u4E00\u573A\u5BF9\u8BDD\uFF0C\u518D flush \u8BB0\u5FC6\u3002",
    drawerTasks: "\u4EFB\u52A1",
    drawerPlan: "\u8BA1\u5212",
    tasksEmpty: "\u5F53\u524D\u4F1A\u8BDD\u6CA1\u6709\u540E\u53F0\u4EFB\u52A1\u3002",
    tasksKill: "\u7ED3\u675F",
    tasksRunning: "\u8FD0\u884C\u4E2D",
    tasksDone: "\u5DF2\u7ED3\u675F",
    planEmpty: "\u8FD9\u4E2A\u4F1A\u8BDD\u8FD8\u6CA1\u6709\u8BA1\u5212\u3002\u5148\u7528 /plan\u3002",
    stepsTitle: "\u6B65\u9AA4",
    stepsCount: "{done}/{n}",
    dashboardApply: "\u5408\u56DE",
    askTitle: "Grok \u60F3\u786E\u8BA4\u4E00\u4E0B",
    askOther: "\u5176\u4ED6",
    askOtherHint: "\u81EA\u5DF1\u8865\u5145\u8BF4\u660E",
    askSubmit: "\u53D1\u9001",
    askMultiHint: "\u53EF\u591A\u9009\uFF0C\u9009\u5B8C\u540E\u53D1\u9001",
    copyOutsideWorkspace: "\u5199\u5165\u6587\u4EF6\u53EA\u5141\u8BB8\u5DE5\u4F5C\u533A\u8DEF\u5F84\u3002",
    askQuestionOf: "\u7B2C {n} / {total} \u9898",
    planReadyTitle: "\u8BA1\u5212\u5DF2\u5199\u597D",
    planReadyEmpty: "\u8FD8\u6CA1\u6709\u5199\u51FA\u8BA1\u5212\u3002\u53EF\u4EE5\u5F00\u59CB\u6267\u884C\uFF0C\u6216\u8865\u5145\u610F\u89C1\u540E\u518D\u6539\u4E00\u7248\u3002",
    planExecute: "\u6267\u884C",
    planExecuteHint: "\u9000\u51FA\u8BA1\u5212\u6A21\u5F0F\uFF0C\u5207\u5230\u4EE3\u7406\u6A21\u5F0F\u5E76\u5F00\u59CB\u6539\u4EE3\u7801\u3002",
    planDecline: "\u4E0D\u6267\u884C",
    planDeclineHint: "\u4FDD\u6301\u8BA1\u5212\u6A21\u5F0F\uFF0C\u4E0D\u5F00\u59CB\u5B9E\u73B0\uFF0C\u7B49\u4F60\u4E0B\u4E00\u6761\u6D88\u606F\u3002",
    planSupplement: "\u8865\u5145",
    planSupplementHint: "\u5E0C\u671B\u8BA1\u5212\u600E\u4E48\u6539\uFF1F",
    askHint: "\u8BE6\u7EC6\u8BF4\u660E",
    sessionsEmpty: "\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u4F1A\u8BDD\u3002",
    sessionsLive: "\u8FDB\u884C\u4E2D",
    sessionsDone: "\u672A\u8BFB\u5B8C\u6210",
    sessionsStopped: "\u5DF2\u4E2D\u65AD",
    sessionsModeList: "\u4F20\u7EDF\u603B\u89C8",
    sessionsModeWorkspace: "\u5DE5\u4F5C\u533A\u603B\u89C8",
    sessionsCurrentWorkspace: "\u5F53\u524D\u5DE5\u4F5C\u533A",
    sessionsUnknownWorkspace: "\u672A\u77E5\u6587\u4EF6\u5939",
    sessionsGroupCount: "{n} \u4E2A\u4F1A\u8BDD",
    sessionsRename: "\u91CD\u547D\u540D",
    sessionsDelete: "\u5220\u9664",
    sessionsDeleteConfirm: "\u5220\u9664\u4F1A\u8BDD {name}\uFF1F",
    sessionsRenamed: "\u5DF2\u91CD\u547D\u540D\u4E3A {name}\u3002",
    forkFailed: "\u65E0\u6CD5\u5206\u53C9\u6B64\u4F1A\u8BDD\u3002",
    compacting: "\u6B63\u5728\u538B\u7F29\u4E0A\u4E0B\u6587\u2026",
    compactLive: "\u6B63\u5728\u538B\u7F29\u5BF9\u8BDD\uFF0C\u4EE5\u4FBF\u7EE7\u7EED\u804A\u5929\u2026",
    compactAutoLive: "\u6B63\u5728\u81EA\u52A8\u538B\u7F29\u4E0A\u4E0B\u6587",
    compactDone: "\u5DF2\u538B\u7F29\u5BF9\u8BDD\u5386\u53F2\u3002",
    compactAutoDone: "\u4E0A\u4E0B\u6587\u5C06\u6EE1\uFF0C\u5DF2\u538B\u7F29\u8F83\u65E9\u5386\u53F2\u5E76\u4FDD\u7559\u6700\u8FD1\u51E0\u8F6E\u3002",
    compactFailed: "\u538B\u7F29\u4E0A\u4E0B\u6587\u5931\u8D25",
    compactBusy: "\u8BF7\u7B49\u5F53\u524D\u56DE\u590D\u7ED3\u675F\u540E\u518D\u538B\u7F29\u3002",
    rewindEmpty: "\u5F53\u524D\u4F1A\u8BDD\u6CA1\u6709\u53EF\u56DE\u9000\u7684\u56DE\u5408\u3002",
    rewindPick: "\u56DE\u9000\u5230\u56DE\u5408",
    rewindConfirm: "\u56DE\u9000\u5230\u8FD9\u4E00\u56DE\u5408\uFF1F\u4E4B\u540E\u7684\u5BF9\u8BDD\u548C\u6587\u4EF6\u6539\u52A8\u4F1A\u88AB\u64A4\u6389\u3002",
    rewindAction: "\u56DE\u9000",
    queued: "\u5DF2\u6392\u961F\uFF1A{n}",
    queueSendNow: "\u7ACB\u5373\u53D1\u9001",
    removeAttach: "\u79FB\u9664",
    attach: "\u9644\u52A0",
    attachPick: "\u76F8\u518C\u548C\u6587\u4EF6",
    dropFiles: "\u62D6\u5165\u6587\u4EF6\u6216\u6587\u4EF6\u5939\u4EE5\u5F15\u7528",
    quoteInChat: "\u5F15\u7528\u5230\u5BF9\u8BDD",
    modeAsk: "\u95EE\u7B54",
    modePlan: "\u8BA1\u5212",
    modeAgent: "\u4EE3\u7406",
    modeGoal: "\u76EE\u6807",
    goalPause: "\u6682\u505C\u76EE\u6807",
    goalResume: "\u7EE7\u7EED\u76EE\u6807",
    goalClose: "\u7ED3\u675F\u76EE\u6807",
    goalStartHint: "\u5199\u4E0B\u76EE\u6807\uFF0C\u70B9\u53D1\u9001\u5373\u5F00\u59CB",
    goalFollowHint: "\u7ED9\u6B63\u5728\u8FDB\u884C\u7684\u76EE\u6807\u8865\u5145\u8BF4\u660E",
    goalResumeHint: "\u70B9\u53D1\u9001\u7EE7\u7EED\uFF0C\u4E5F\u53EF\u4EE5\u5148\u8865\u4E00\u53E5\u8BF4\u660E",
    goalRunningHint: "\u76EE\u6807\u8FDB\u884C\u4E2D\uFF0C\u505C\u6B62\u53EA\u4F1A\u6682\u505C",
    goalBarRunning: "\u8FDB\u884C\u4E2D\u7684\u76EE\u6807",
    goalBarPaused: "\u5DF2\u6682\u505C\u7684\u76EE\u6807",
    goalEdit: "\u7F16\u8F91\u76EE\u6807",
    goalEditHint: "\u6539\u5B8C\u76EE\u6807\u540E\u53D1\u9001",
    goalStatus: "\u76EE\u6807\u72B6\u6001",
    switchMode: "\u5207\u6362\u6A21\u5F0F",
    switchModel: "\u5207\u6362\u6A21\u578B",
    switchEffort: "\u601D\u8003\u5F3A\u5EA6",
    busyLock: "\u8BF7\u5148\u4E2D\u65AD\u5F53\u524D\u4EFB\u52A1\u518D\u8C03\u6574",
    stop: "\u505C\u6B62",
    send: "\u53D1\u9001",
    fileSearchHint: "\u8F93\u5165\u4EE5\u641C\u7D22\u5DE5\u4F5C\u533A\u6587\u4EF6",
    placeholderLogin: "\u767B\u5F55\u540E\u5F00\u59CB",
    placeholderQueue: "\u6392\u961F\u4E0B\u4E00\u6761\u2026",
    placeholderAsk: "\u8BA9 Grok \u5F00\u59CB\u6784\u5EFA\uFF0C\u6216\u8F93\u5165 /",
    cliTitle: "\u5B89\u88C5 Grok CLI",
    cliBody: "\u6B64\u6269\u5C55\u901A\u8FC7 ACP \u8FDE\u63A5\u672C\u673A grok \u547D\u4EE4\u3002\u5B89\u88C5\u4E00\u6B21\u540E\u5373\u53EF\u5728\u6B64\u767B\u5F55\u3002",
    cliInstall: "\u5728\u7EC8\u7AEF\u4E2D\u5B89\u88C5",
    cliReady: "\u6211\u5DF2\u7ECF\u88C5\u597D\u4E86",
    loginWaitTitle: "\u7B49\u5F85\u6D4F\u89C8\u5668\u2026",
    loginTitle: "\u767B\u5F55 Grok Build",
    loginWaitBody: "\u8BF7\u5728\u521A\u6253\u5F00\u7684\u9875\u9762\u5B8C\u6210\u767B\u5F55\u3002\u82E5\u56DE\u8DF3\u672A\u5B8C\u6210\uFF0C\u53EF\u91CD\u65B0\u6253\u5F00\u6216\u7C98\u8D34\u9A8C\u8BC1\u7801\u3002",
    loginBody: "\u5728\u6D4F\u89C8\u5668\u6253\u5F00 auth.x.ai\uFF0C\u4E0E grok login \u76F8\u540C\u3002\u652F\u6301 SuperGrok\u3001X Premium+ \u6216 xAI API \u5BC6\u94A5\u3002",
    loginDevice: "\u8BBE\u5907\u767B\u5F55\uFF1A\u8BF7\u5728\u8BE5\u9875\u9762\u786E\u8BA4\u9A8C\u8BC1\u7801\u3002",
    loginReopen: "\u518D\u6B21\u6253\u5F00\u6D4F\u89C8\u5668",
    cancel: "\u53D6\u6D88",
    permDetails: "\u8BE6\u60C5",
    permAllowOnce: "\u5141\u8BB8",
    permAllowAlways: "\u59CB\u7EC8\u5141\u8BB8",
    permAllowEditsSession: "\u5141\u8BB8\u7F16\u8F91",
    permReject: "\u62D2\u7EDD",
    permRejectTell: "\u62D2\u7EDD",
    askModeBlocked: "\u95EE\u7B54\u6A21\u5F0F\u4E0D\u80FD\u6539\u4EE3\u7801\u3002\u8981\u7EE7\u7EED\u8FD9\u6B21\u4FEE\u6539\uFF0C\u8BF7\u5207\u6362\u5230\u4EE3\u7406\u6A21\u5F0F\u3002",
    askModeSwitch: "\u5207\u6362\u5230\u4EE3\u7406\u5E76\u5141\u8BB8",
    askModeStay: "\u7559\u5728\u95EE\u7B54",
    loginWith: "\u4F7F\u7528 {label} \u767B\u5F55",
    loginGrok: "\u4F7F\u7528 Grok \u767B\u5F55",
    loginSkip: "\u8DF3\u8FC7",
    pasteCode: "\u9700\u8981\u65F6\u7C98\u8D34\u9A8C\u8BC1\u7801",
    submit: "\u63D0\u4EA4",
    useApiKey: "\u6539\u7528 API \u5BC6\u94A5",
    promptApiKey: "\u7C98\u8D34\u6765\u81EA console.x.ai \u7684 xAI API \u5BC6\u94A5",
    errorTitle: "\u51FA\u4E86\u70B9\u95EE\u9898",
    turnError: "\u8BF7\u6C42\u5931\u8D25",
    agentExited: "Grok \u4EE3\u7406\u5DF2\u505C\u6B62\uFF0C\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5\u2026",
    agentExitedGiveUp: "Grok \u4EE3\u7406\u5DF2\u505C\u6B62\uFF0C\u8BF7\u4ECE\u83DC\u5355\u91CD\u65B0\u542F\u52A8\u3002",
    turnRetrying: "\u6B63\u5728\u91CD\u8BD5 {n}/{max}",
    errorCode: "\u9519\u8BEF\u7801 {code}",
    errorUntrustedCert: "\u8BC1\u4E66\u4E0D\u88AB\u4FE1\u4EFB\u3002\u8BF7\u628A\u4E2D\u8F6C\u7AD9 CA \u88C5\u8FDB\u7CFB\u7EDF\uFF0C\u6216\u8BBE\u7F6E GROK_EXTRA_CA_BUNDLE \u6307\u5411\u5B83\u7684 PEM\u3002",
    errorApiKeyRejected: "\u8FD9\u4E2A\u63A5\u53E3\u62D2\u7EDD\u4E86\u51ED\u8BC1\u3002\u81EA\u5B9A\u4E49\u4E2D\u8F6C\u8BF7\u5230 API \u7BA1\u7406\u6838\u5BF9\u5BC6\u94A5\uFF1B/login \u53EA\u7528\u4E8E grok.com \u5B98\u65B9\u767B\u5F55\u3002",
    errorRelayAfterOfficialLogin: "\u5B98\u65B9\u767B\u5F55\u5DF2\u7ECF\u5237\u65B0\uFF0C\u4F46\u4E2D\u8F6C\u7AD9\u4ECD\u8FD4\u56DE 401\u3002\u8BF7\u5728 API \u7BA1\u7406\u91CC\u586B\u5199\u4E2D\u8F6C\u81EA\u5DF1\u7684 API Key\uFF1Bgrok.com \u7684\u767B\u5F55\u51ED\u8BC1\u4E0D\u80FD\u7528\u5728\u7B2C\u4E09\u65B9\u3002",
    retry: "\u91CD\u8BD5",
    homeTitle: "\u8981\u6784\u5EFA\u4EC0\u4E48\uFF1F",
    homeBody: "Grok \u53EF\u4EE5\u7F16\u8F91\u6B64\u5DE5\u4F5C\u533A\u3001\u8FD0\u884C\u547D\u4EE4\uFF0C\u5E76\u4F7F\u7528\u659C\u6760\u5DE5\u5177\u3002/ \u8C03\u547D\u4EE4\uFF0C@ \u9644\u52A0\u6587\u4EF6\u3002",
    starter1: "\u89E3\u91CA\u8FD9\u4E2A\u4ED3\u5E93\u662F\u600E\u4E48\u7EC4\u7EC7\u7684",
    starter2: "\u68C0\u67E5\u6211\u6253\u5F00\u7684\u6587\u4EF6\u91CC\u7684\u95EE\u9898",
    starter3: "\u7ED9\u6700\u8FD1\u7684\u6539\u52A8\u5199\u6D4B\u8BD5",
    recent: "\u6700\u8FD1",
    you: "\u4F60",
    grok: "Grok",
    connRttHint: "\u5230\u5F53\u524D\u4F1A\u8BDD\u7684\u5F80\u8FD4\u5EF6\u8FDF",
    plan: "\u8BA1\u5212",
    thinking: "\u601D\u8003",
    thinkingNow: "\u601D\u8003\u4E2D\u2026",
    heroOpen: "\u6253\u5F00",
    heroReveal: "\u5728\u6587\u4EF6\u5939\u4E2D\u663E\u793A",
    heroOpenBrowser: "\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00",
    heroOpenImage: "\u6253\u5F00\u56FE\u7247",
    heroKindWeb: "\u7F51\u9875",
    heroKindImage: "\u56FE\u7247",
    heroKindFolder: "\u6587\u4EF6\u5939",
    heroKindApp: "\u5E94\u7528\u7A0B\u5E8F",
    heroKindFile: "\u6587\u4EF6",
    toolOk: "\u5B8C\u6210",
    toolFailed: "\u5931\u8D25",
    toolRunning: "\u8FDB\u884C\u4E2D",
    taskStarted: "\u5F00\u59CB",
    taskCompleted: "\u5B8C\u6210",
    elapsed: "\u7528\u65F6 {time}",
    elapsedLive: "\u5DF2\u7528\u65F6 {time}",
    copy: "\u590D\u5236",
    copied: "\u5DF2\u590D\u5236",
    working: "\u6B63\u5728\u5904\u7406",
    editsTitle: "{n} \u5904\u4FEE\u6539",
    liveEdits: "\u6B63\u5728\u6539 {n} \u4E2A\u6587\u4EF6",
    jumpBottom: "\u56DE\u5230\u6700\u65B0",
    jumpBottomLive: "\u8FDB\u884C\u4E2D\uFF0C\u56DE\u5230\u6700\u65B0",
    undo: "\u8FD8\u539F",
    review: "\u5BA1\u67E5",
    editsMore: "\u8FD8\u6709 {n} \u4E2A",
    previewImage: "\u9884\u89C8\u56FE\u7247",
    closePreview: "\u5173\u95ED\u9884\u89C8",
    revertConfirm: "\u8FD8\u539F\u672C\u8F6E\u66F4\u6539\u7684 {n} \u4E2A\u6587\u4EF6\uFF1F",
    revertAction: "\u8FD8\u539F",
    revertDone: "\u5DF2\u8FD8\u539F {n} \u4E2A\u6587\u4EF6",
    revertNone: "\u8FD9\u4E00\u8F6E\u6CA1\u6709\u53EF\u8FD8\u539F\u7684\u6587\u4EF6",
    revertFailed: "{n} \u4E2A\u6587\u4EF6\u672A\u80FD\u8FD8\u539F",
    revertWorking: "\u6B63\u5728\u8FD8\u539F\u6587\u4EF6\u2026",
    grokDiff: "Grok Diff",
    reviewTitle: "\u66F4\u6539\u5BA1\u67E5",
    reviewEmpty: "\u6CA1\u6709\u53EF\u5BA1\u67E5\u7684\u6587\u4EF6\u66F4\u6539",
    reviewDiff: "{name}\uFF1A\u66F4\u6539\u524D \u2194 \u5F53\u524D",
    reviewMissing: "{name} \u6CA1\u6709\u66F4\u6539\u524D\u5FEB\u7167\uFF0C\u5DF2\u6253\u5F00\u5F53\u524D\u6587\u4EF6",
    remoteFileTooLarge: "\u6587\u4EF6\u592A\u5927\uFF0C\u65E0\u6CD5\u5728\u6D4F\u89C8\u5668\u91CC\u6253\u5F00\u3002",
    remoteFileBinary: "\u8FD9\u662F\u4E8C\u8FDB\u5236\u6587\u4EF6\u3002\u82E5\u672C\u673A IDE \u5F00\u7740\uFF0C\u5DF2\u5728 IDE \u91CC\u6253\u5F00\u3002",
    remoteFileMissing: "\u8BFB\u4E0D\u4E86\u8FD9\u4E2A\u6587\u4EF6\u3002",
    remoteViewSidebar: "\u4FA7\u8FB9\u680F",
    remoteViewWorkspace: "\u5DE5\u4F5C\u533A",
    wsSearch: "\u7B5B\u9009\u6587\u4EF6",
    wsEmpty: "\u7D22\u5F15\u91CC\u6CA1\u6709\u6587\u4EF6\u3002",
    wsOpenHint: "\u70B9\u6587\u4EF6\u67E5\u770B\u3002\u53EA\u652F\u6301\u5C0F\u6539\uFF1B\u5927\u6539\u8BF7\u4E0A\u673A\uFF0C\u6216\u53D1\u7ED9 Grok\u3002",
    wsSave: "\u4FDD\u5B58",
    wsSaved: "\u5DF2\u4ECE\u6D4F\u89C8\u5668\u4FDD\u5B58 {name}\u3002",
    wsReview: "\u5BA1\u67E5",
    wsTellAi: "\u53D1\u7ED9 Grok",
    wsTellAiHint: "\u63CF\u8FF0\u66F4\u5927\u7684\u6539\u52A8\uFF0CGrok \u4F1A\u5728\u4FA7\u8FB9\u680F\u91CC\u505A\u3002",
    wsConflict: "\u7535\u8111\u4E0A\u8FD9\u4EFD\u6587\u4EF6\u5DF2\u7ECF\u53D8\u4E86\u3002\u8BF7\u91CD\u65B0\u6253\u5F00\u518D\u4FDD\u5B58\u3002",
    wsTooBig: "\u6587\u4EF6\u592A\u5927\uFF0C\u4E0D\u9002\u5408\u5728\u6D4F\u89C8\u5668\u91CC\u6539\u3002",
    wsTooMany: "\u8FD9\u6B21\u6539\u52A8\u592A\u5927\uFF0C\u4E0D\u9002\u5408\u5728\u6D4F\u89C8\u5668\u91CC\u6539\u3002",
    wsBinary: "\u6D4F\u89C8\u5668\u4E0D\u80FD\u6539\u4E8C\u8FDB\u5236\u6587\u4EF6\u3002",
    wsMissing: "\u6D4F\u89C8\u5668\u8BFB/\u5199\u8FD9\u4E2A\u6587\u4EF6\u5931\u8D25\u3002",
    wsBusy: "Grok \u6B63\u5728\u6539\u8FD9\u4E2A\u6587\u4EF6\u3002\u8BF7\u7B49\u7ED3\u675F\uFF0C\u6216\u5728\u804A\u5929\u91CC\u8BF4\u3002",
    wsTruncated: "\u7D22\u5F15\u5230 {n} \u4E2A\u6587\u4EF6\u5C31\u505C\u4E86\u3002\u7528\u7B5B\u9009\u7F29\u5C0F\u8303\u56F4\u3002",
    wsNeedComputer: "\u6539\u52A8\u592A\u5927\u3002\u8BF7\u4E0A\u673A\u6539\uFF0C\u6216\u5728\u804A\u5929\u91CC\u8BA9 Grok \u6539\u3002",
    wsDirty: "\u672A\u4FDD\u5B58",
    wsDiscard: "\u653E\u5F03\u6D4F\u89C8\u5668\u91CC\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\uFF1F",
    wsBack: "\u6587\u4EF6\u5217\u8868",
    wsExplorer: "\u8D44\u6E90\u7BA1\u7406\u5668",
    wsOpenEditors: "\u6253\u5F00\u7684\u7F16\u8F91\u5668",
    wsCloseTab: "\u5173\u95ED",
    wsNewFile: "\u65B0\u5EFA\u6587\u4EF6",
    wsNewFolder: "\u65B0\u5EFA\u6587\u4EF6\u5939",
    wsRename: "\u91CD\u547D\u540D",
    wsDelete: "\u5220\u9664",
    wsNewFileName: "\u6587\u4EF6\u540D",
    wsNewFolderName: "\u6587\u4EF6\u5939\u540D",
    wsRenameName: "\u65B0\u540D\u79F0",
    wsDeleteConfirm: "\u5220\u9664 {name}\uFF1F",
    wsEditor: "\u4EE3\u7801\u7F16\u8F91",
    wsFold: "\u6298\u53E0",
    wsUnfold: "\u5C55\u5F00",
    diffFiles: "\u672C\u8F6E {n} \u4E2A\u6587\u4EF6",
    diffSplit: "\u5E76\u6392",
    diffUnified: "\u5408\u4E00",
    diffGap: "\u672A\u6539 {n} \u884C",
    diffMore: "\u8FD8\u6709 {n} \u884C",
    diffOpen: "\u6253\u5F00",
    diffCreated: "\u65B0\u5EFA",
    diffDeleted: "\u5DF2\u5220",
    diffBefore: "\u66F4\u6539\u524D",
    diffAfter: "\u5F53\u524D",
    ctxTitle: "\u4E0A\u4E0B\u6587",
    ctxWaiting: "\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u7528\u91CF",
    ctxFree: "\u5269\u4F59",
    ctxSystem: "\u7CFB\u7EDF\u63D0\u793A",
    ctxMessages: "\u5BF9\u8BDD",
    ctxTools: "\u5DE5\u5177\u5B9A\u4E49",
    ctxCompact: "\u81EA\u52A8\u538B\u7F29\u4E8E {pct}%",
    untrustedTitle: "\u6B64\u5DE5\u4F5C\u533A\u4E0D\u53D7\u4FE1\u4EFB",
    untrustedBody: "\u5148\u4FE1\u4EFB\u8BE5\u6587\u4EF6\u5939\uFF0CGrok Build \u624D\u80FD\u8FD0\u884C\u672C\u5730 agent\u3002",
    startingTitle: "\u6B63\u5728\u542F\u52A8 Grok\u2026",
    startingBody: "\u6B63\u5728\u8FDE\u63A5\u672C\u673A grok agent\u3002",
    restoringTitle: "\u6B63\u5728\u6062\u590D\u4F1A\u8BDD\u2026",
    restoringBody: "\u6B63\u5728\u52A0\u8F7D\u8BE5\u5BF9\u8BDD\u7684\u804A\u5929\u8BB0\u5F55\u548C\u4E0A\u4E0B\u6587\u3002",
    timeJustNow: "\u521A\u521A",
    timeMinutes: "{n} \u5206",
    timeHours: "{n} \u5C0F\u65F6",
    timeDays: "{n} \u5929",
    effortXhigh: "\u6781\u9AD8",
    effortMax: "\u6700\u5F3A",
    effortHigh: "\u9AD8",
    effortMedium: "\u4E2D",
    effortLow: "\u4F4E",
    imgGenerated: "\u751F\u6210\u7684\u56FE\u7247",
    toolRead: "\u9605\u8BFB",
    toolEdit: "\u7F16\u8F91",
    toolWrite: "\u5199\u5165",
    toolTerminal: "\u7EC8\u7AEF",
    toolSearch: "\u641C\u7D22",
    toolDelete: "\u5220\u9664",
    toolCompact: "\u538B\u7F29",
    toolGeneric: "\u5DE5\u5177",
    termRun: "\u8FD0\u884C\u60C5\u51B5",
    termIdle: "\u7B49\u5F85\u8F93\u51FA",
    cronTitle: "\u5B9A\u65F6\u4EFB\u52A1",
    cronHint: "\u5E94\u7528\u5728\u8FD0\u884C\u65F6\u6309\u70B9\u53D1\u9001\u63D0\u793A\u8BCD\u3002\u9519\u8FC7\u7684\u8F6E\u6B21\u4F1A\u8DF3\u8FC7\uFF0C\u4E0D\u4F1A\u8865\u53D1\u3002",
    cronNew: "\u65B0\u5EFA\u4EFB\u52A1",
    cronList: "\u4EFB\u52A1\u5217\u8868",
    cronEmpty: "\u8FD8\u6CA1\u6709\u5B9A\u65F6\u4EFB\u52A1\u3002",
    cronTitleField: "\u540D\u79F0",
    cronPrompt: "\u63D0\u793A\u8BCD",
    cronWhen: "\u5468\u671F",
    cronOnce: "\u4E00\u6B21",
    cronDaily: "\u6BCF\u5929",
    cronWeekly: "\u6BCF\u5468",
    cronInterval: "\u95F4\u9694",
    cronAt: "\u65E5\u671F\u65F6\u95F4",
    cronTime: "\u65F6\u95F4",
    cronWeekday: "\u661F\u671F",
    cronEvery: "\u6BCF\u9694",
    cronSave: "\u4FDD\u5B58\u4EFB\u52A1",
    cronRunNow: "\u7ACB\u5373\u8FD0\u884C",
    cronDelete: "\u5220\u9664",
    cronPaused: "\u5DF2\u6682\u505C",
    cronNoNext: "\u65E0\u4E0B\u6B21\u8FD0\u884C",
    cronNext: "\u4E0B\u6B21 {at}",
    cronOnceAt: "\u4E00\u6B21 \xB7 {at}",
    cronDailyAt: "\u6BCF\u5929 {at}",
    cronWeeklyAt: "\u6BCF\u5468{day} {at}",
    cronEveryLabel: "\u6BCF {every}",
    cronEvery15m: "15 \u5206\u949F",
    cronEvery1h: "1 \u5C0F\u65F6",
    cronEvery6h: "6 \u5C0F\u65F6",
    cronEvery12h: "12 \u5C0F\u65F6",
    cronEvery1d: "1 \u5929",
    cronSun: "\u65E5",
    cronMon: "\u4E00",
    cronTue: "\u4E8C",
    cronWed: "\u4E09",
    cronThu: "\u56DB",
    cronFri: "\u4E94",
    cronSat: "\u516D",
    cronEnabledCount: "{n} \u4E2A\u5F00\u542F",
    cronFired: "\u5B9A\u65F6\u4EFB\u52A1\uFF1A{title}"
  };
  function t(locale, key, vars) {
    const table = locale === "zh-CN" ? ZH : EN;
    let out = table[key] ?? EN[key];
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        out = out.replaceAll(`{${name}}`, String(value));
      }
    }
    return out;
  }

  // src/settings/wallpaper.ts
  var DEFAULT_WALLPAPER_OPACITY = 22;
  var DEFAULT_WALLPAPER_SCALE = 100;
  var MIN_WALLPAPER_SCALE = 20;
  var MAX_WALLPAPER_SCALE = 800;
  var DEFAULT_GLASS_OPACITY = 68;
  var DEFAULT_GLASS_BLUR = 18;
  var DEFAULT_CHROME_BLUR = 18;
  var DEFAULT_CHROME_GLASS_OPACITY = 72;
  var MAX_GLASS_BLUR = 100;
  var GLASS_LAYER_FACTOR = [0, 1, 1.25, 1.45, 1.65, 1.85, 2.05, 2.25];
  function clampWallpaperOpacity(raw) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return DEFAULT_WALLPAPER_OPACITY;
    }
    return Math.max(0, Math.min(100, Math.round(n)));
  }
  function wallpaperKind(raw) {
    return raw === "icon" || raw === "custom" ? raw : void 0;
  }
  function wallpaperExt(raw) {
    if (!raw) {
      return "";
    }
    const clean = raw.split(/[?#]/)[0].replace(/\\/g, "/");
    const base = clean.slice(clean.lastIndexOf("/") + 1);
    const dot = base.lastIndexOf(".");
    return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
  }
  function surfaceKind(raw) {
    return raw === "glass" || raw === "solid" ? raw : void 0;
  }
  function clampGlassOpacity(raw) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return DEFAULT_GLASS_OPACITY;
    }
    return Math.max(0, Math.min(100, Math.round(n)));
  }
  function clampGlassBlur(raw) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return DEFAULT_GLASS_BLUR;
    }
    return Math.max(0, Math.min(MAX_GLASS_BLUR, Math.round(n)));
  }
  function clampChromeBlur(raw) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return DEFAULT_CHROME_BLUR;
    }
    return Math.max(0, Math.min(MAX_GLASS_BLUR, Math.round(n)));
  }
  function clampChromeGlassOpacity(raw) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return DEFAULT_CHROME_GLASS_OPACITY;
    }
    return Math.max(0, Math.min(100, Math.round(n)));
  }
  function glassLayerBlur(basePx, layer) {
    const factor = GLASS_LAYER_FACTOR[layer] ?? GLASS_LAYER_FACTOR[7];
    return Math.min(MAX_GLASS_BLUR, Math.round(Math.max(0, basePx) * factor));
  }
  function chromeLayerBlur(basePx, layer) {
    return glassLayerBlur(basePx, Math.max(2, layer));
  }
  function clampWallpaperScale(raw) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return DEFAULT_WALLPAPER_SCALE;
    }
    return Math.max(MIN_WALLPAPER_SCALE, Math.min(MAX_WALLPAPER_SCALE, Math.round(n)));
  }
  function clampWallpaperAxis(raw, fallback = 50) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // src/settings/theme.ts
  var DEFAULT_FONT_SIZE = 13;
  var MIN_FONT_SIZE = 10;
  var MAX_FONT_SIZE = 22;
  var DEFAULT_LETTER_SPACING = 0;
  var MIN_LETTER_SPACING = -4;
  var MAX_LETTER_SPACING = 8;
  var THEME_FONT_FAMILY = "Grok Custom";
  var FONT_EXTS = ["ttf", "otf", "woff", "woff2"];
  var DEFAULT_THEME = {
    primary: "#b9d4ff",
    secondary: "#3fb950"
  };
  var SURFACE_VARS = ["--bg", "--fg", "--muted", "--elev", "--line", "--hover"];
  function parseHex(raw) {
    if (typeof raw !== "string") {
      return void 0;
    }
    const value = raw.trim();
    const short = /^#([0-9a-f]{3})$/i.exec(value);
    if (short) {
      const [r, g, b] = short[1];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    const full = /^#([0-9a-f]{6})$/i.exec(value);
    return full ? `#${full[1].toLowerCase()}` : void 0;
  }
  function contrastFg(background) {
    return hexLuminance(background) > 0.4 ? "#1c1c1c" : "#e8e8e8";
  }
  function normalizeTheme(raw) {
    const value = raw && typeof raw === "object" ? raw : {};
    const background = parseHex(value.background);
    const wallpaper = wallpaperKind(value.wallpaper);
    const wallpaperPath = typeof value.wallpaperPath === "string" && value.wallpaperPath.trim() ? value.wallpaperPath.trim() : void 0;
    const customPath = wallpaper === "custom" ? wallpaperPath : void 0;
    const kind = wallpaper === "custom" && !customPath ? void 0 : wallpaper;
    const surface = surfaceKind(value.surface);
    const manual = kind && value.wallpaperScale != null;
    return {
      primary: parseHex(value.primary) ?? DEFAULT_THEME.primary,
      secondary: parseHex(value.secondary) ?? DEFAULT_THEME.secondary,
      ...background ? { background } : {},
      ...kind ? { wallpaper: kind } : {},
      ...kind ? { wallpaperOpacity: clampWallpaperOpacity(value.wallpaperOpacity) } : {},
      ...customPath ? { wallpaperPath: customPath } : {},
      ...manual ? { wallpaperScale: clampWallpaperScale(value.wallpaperScale) } : {},
      ...manual ? { wallpaperX: clampWallpaperAxis(value.wallpaperX) } : {},
      ...manual ? { wallpaperY: clampWallpaperAxis(value.wallpaperY) } : {},
      ...surface ? { surface } : {},
      ...surface === "glass" || value.glassOpacity != null ? { glassOpacity: clampGlassOpacity(value.glassOpacity) } : {},
      ...surface === "glass" || value.glassBlur != null ? { glassBlur: clampGlassBlur(value.glassBlur) } : {},
      ...surface === "glass" || value.chromeBlur != null ? { chromeBlur: clampChromeBlur(value.chromeBlur) } : {},
      ...value.chromeGlass === true ? { chromeGlass: true } : {},
      ...value.chromeGlass === true || value.chromeGlassOpacity != null ? { chromeGlassOpacity: clampChromeGlassOpacity(value.chromeGlassOpacity) } : {},
      ...typeof value.fontPath === "string" && value.fontPath.trim() && isFontFile(value.fontPath) ? { fontPath: value.fontPath.trim() } : {},
      ...value.fontSize != null ? { fontSize: clampFontSize(value.fontSize) } : {},
      ...value.letterSpacing != null ? { letterSpacing: clampLetterSpacing(value.letterSpacing) } : {},
      ...parseHex(value.fontColor) ? { fontColor: parseHex(value.fontColor) } : {},
      ...value.lockContrast === false ? { lockContrast: false } : {}
    };
  }
  function isFontFile(raw) {
    return FONT_EXTS.includes(wallpaperExt(raw));
  }
  function clampFontSize(raw) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return DEFAULT_FONT_SIZE;
    }
    return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(n)));
  }
  function clampLetterSpacing(raw) {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (!Number.isFinite(n)) {
      return DEFAULT_LETTER_SPACING;
    }
    return Math.max(MIN_LETTER_SPACING, Math.min(MAX_LETTER_SPACING, Math.round(n)));
  }
  function lockContrastEnabled(theme) {
    return theme.lockContrast !== false;
  }
  function applyThemeTo(style, raw, chrome) {
    const theme = normalizeTheme(raw);
    const background = theme.background ?? parseHex(chrome?.background);
    const hostFg = parseHex(chrome?.foreground);
    const fg = resolveFg(theme, background, hostFg);
    if (background) {
      style.setProperty("--bg", background);
      style.setProperty("--fg", fg ?? contrastFg(background));
      style.setProperty("--muted", "color-mix(in srgb, var(--fg) 55%, transparent)");
      style.setProperty("--elev", "color-mix(in srgb, var(--fg) 6%, var(--bg))");
      style.setProperty("--line", "color-mix(in srgb, var(--fg) 12%, transparent)");
      style.setProperty("--hover", "color-mix(in srgb, var(--fg) 8%, transparent)");
    } else {
      for (const name of SURFACE_VARS) {
        style.removeProperty?.(name);
      }
      if (fg) {
        style.setProperty("--fg", fg);
      }
    }
    style.setProperty("--font-size", `${theme.fontSize ?? DEFAULT_FONT_SIZE}px`);
    style.setProperty("--letter-spacing", `${theme.letterSpacing ?? DEFAULT_LETTER_SPACING}px`);
    if (theme.fontPath || theme.fontUrl) {
      style.setProperty("--font", `'${THEME_FONT_FAMILY}', var(--vscode-font-family, sans-serif)`);
    } else {
      style.removeProperty?.("--font");
    }
    style.setProperty("--ice", `color-mix(in srgb, ${theme.primary} 72%, var(--fg))`);
    style.setProperty("--ice-dim", "color-mix(in srgb, var(--ice) 28%, transparent)");
    style.setProperty("--ok", theme.secondary);
    style.setProperty("--glass-fill", `${theme.glassOpacity ?? DEFAULT_GLASS_OPACITY}%`);
    const bgBlur = theme.glassBlur ?? DEFAULT_GLASS_BLUR;
    const chromeBlur = theme.chromeBlur ?? DEFAULT_CHROME_BLUR;
    style.setProperty("--glass-blur", `${bgBlur}px`);
    style.setProperty("--glass-1-blur", `${bgBlur}px`);
    style.setProperty("--glass-bg-pad", bgBlur > 0 ? "1.08" : "1");
    style.setProperty("--glass-plate-filter", bgBlur > 0 ? `blur(${bgBlur}px) saturate(1.45)` : "none");
    for (let layer = 2; layer <= 7; layer += 1) {
      style.setProperty(`--glass-${layer}-blur`, `${chromeLayerBlur(chromeBlur, layer)}px`);
    }
    style.setProperty(
      "--glass-chrome-filter",
      chromeBlur > 0 ? `blur(${chromeLayerBlur(chromeBlur, 4)}px) saturate(1.35)` : "none"
    );
    style.setProperty(
      "--glass-frost",
      chromeBlur > 0 ? `blur(${chromeLayerBlur(chromeBlur, 4)}px) saturate(1.7) brightness(1.06)` : "none"
    );
    style.setProperty(
      "--glass-2-filter",
      chromeBlur > 0 ? `blur(${chromeLayerBlur(chromeBlur, 2)}px) saturate(1.7) brightness(1.06)` : "none"
    );
    const chromeFill = theme.chromeGlassOpacity ?? DEFAULT_CHROME_GLASS_OPACITY;
    style.setProperty("--chrome-fill", `${chromeFill}%`);
  }
  function resolveFg(theme, background, hostFg) {
    if (!lockContrastEnabled(theme) && theme.fontColor) {
      return theme.fontColor;
    }
    if (background) {
      return hostFg ?? contrastFg(background);
    }
    return hostFg;
  }
  function hexLuminance(hex) {
    const n = Number.parseInt(hex.slice(1), 16);
    const channel = (shift) => {
      const c = (n >> shift & 255) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  }

  // src/webview/editor/diff.ts
  var vscode = window.acquireVsCodeApi();
  var root = document.getElementById("app") ?? document.body;
  var payload = { locale: "en", files: [] };
  var unified = false;
  var openGaps = /* @__PURE__ */ new Set();
  window.addEventListener(
    "message",
    (event) => {
      if (event.data?.type === "diff" && event.data.payload) {
        payload = event.data.payload;
        render();
        return;
      }
      if (event.data?.type === "diffMore" && Array.isArray(event.data.files) && event.data.files.length) {
        payload.files = [...payload.files ?? [], ...event.data.files];
        appendFiles(event.data.files);
      }
    }
  );
  function loc() {
    return payload.locale === "zh-CN" ? "zh-CN" : "en";
  }
  function tr(key, vars) {
    return t(loc(), key, vars);
  }
  function render() {
    applyThemeTo(document.documentElement.style, payload.theme);
    const files = payload.files ?? [];
    const added = files.reduce((sum, file) => sum + file.added, 0);
    const removed = files.reduce((sum, file) => sum + file.removed, 0);
    root.innerHTML = "";
    root.append(toolbar(files.length, added, removed));
    if (files.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = `<span class="mark">${iconStar()}</span><p>${escapeHtml(tr("reviewEmpty"))}</p>`;
      root.append(empty);
      return;
    }
    const stage = document.createElement("div");
    stage.className = "stage";
    for (const [index, file] of files.entries()) {
      stage.append(fileSection(file, index === 0));
    }
    root.append(stage);
  }
  function appendFiles(files) {
    const stage = root.querySelector(".stage");
    if (!(stage instanceof HTMLElement)) {
      render();
      return;
    }
    for (const file of files) {
      stage.append(fileSection(file, false));
    }
    const summary = root.querySelector(".summary");
    if (summary instanceof HTMLElement) {
      const all = payload.files ?? [];
      const added = all.reduce((sum, file) => sum + file.added, 0);
      const removed = all.reduce((sum, file) => sum + file.removed, 0);
      summary.innerHTML = `<span class="pill">${escapeHtml(tr("diffFiles", { n: all.length }))}</span><span class="pill add">+${added}</span><span class="pill del">\u2212${removed}</span>`;
    }
  }
  function toolbar(count, added, removed) {
    const el = document.createElement("header");
    el.className = "toolbar";
    const brand = document.createElement("div");
    brand.className = "brand";
    brand.innerHTML = `<span class="mark">${iconStar()}</span><strong>Grok Diff</strong>`;
    const summary = document.createElement("div");
    summary.className = "summary";
    summary.innerHTML = `<span class="pill">${escapeHtml(tr("diffFiles", { n: count }))}</span><span class="pill add">+${added}</span><span class="pill del">\u2212${removed}</span>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const modes = document.createElement("div");
    modes.className = "modes";
    modes.append(
      modeBtn("split", tr("diffSplit"), !unified),
      modeBtn("unified", tr("diffUnified"), unified)
    );
    const revert = document.createElement("button");
    revert.type = "button";
    revert.className = "ghost-btn";
    revert.textContent = tr("undo");
    revert.addEventListener("click", () => vscode.postMessage({ type: "revert" }));
    actions.append(modes, revert);
    el.append(brand, summary, actions);
    return el;
  }
  function modeBtn(id, label, on) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = on ? "mode on" : "mode";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      unified = id === "unified";
      render();
    });
    return btn;
  }
  function fileSection(file, opened) {
    const el = document.createElement("section");
    el.className = opened ? "file" : "file closed";
    const head = document.createElement("div");
    head.className = "file-head";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "file-toggle";
    const parts = splitPath(file.path);
    toggle.innerHTML = `<span class="chevron">${iconChevron()}</span><span class="file-name">${escapeHtml(parts.name)}</span>${parts.dir ? `<span class="file-dir">${escapeHtml(parts.dir)}</span>` : ""}`;
    const stats = document.createElement("span");
    stats.className = "file-stats";
    const tag = file.created ? tr("diffCreated") : file.deleted ? tr("diffDeleted") : "";
    stats.innerHTML = `${tag ? `<em class="tag ${file.created ? "new" : "gone"}">${escapeHtml(tag)}</em>` : ""}<span class="add">+${file.added}</span><span class="del">\u2212${file.removed}</span>`;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open-btn";
    open.textContent = tr("diffOpen");
    open.addEventListener("click", () => vscode.postMessage({ type: "openFile", path: file.absPath }));
    head.append(toggle, stats, open);
    const pane = document.createElement("div");
    pane.className = "file-pane";
    let filled = false;
    const fill = () => {
      if (filled) {
        return;
      }
      filled = true;
      fillFilePane(pane, file);
    };
    if (opened) {
      fill();
    }
    toggle.addEventListener("click", () => {
      el.classList.toggle("closed");
      if (!el.classList.contains("closed")) {
        fill();
      }
    });
    el.append(head, pane);
    return el;
  }
  function fillFilePane(pane, file) {
    if (!unified) {
      const cols = document.createElement("div");
      cols.className = "col-heads";
      cols.innerHTML = `<span>${escapeHtml(tr("diffBefore"))}</span><span>${escapeHtml(tr("diffAfter"))}</span>`;
      pane.append(cols);
    }
    const stage = document.createElement("div");
    stage.className = "file-stage";
    const rail = document.createElement("div");
    rail.className = "rail";
    const body = document.createElement("div");
    body.className = "file-body";
    for (const [index, hunk] of file.hunks.entries()) {
      const hunkNode = hunkEl(file.absPath, index, hunk);
      hunkNode.dataset.hunk = String(index);
      body.append(hunkNode);
      rail.append(railDot(index, hunk, hunkNode));
    }
    stage.append(rail, body);
    pane.append(stage);
  }
  function railDot(index, hunk, target) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `dot ${hunkTone(hunk)}`;
    btn.title = hunk.kind === "gap" ? tr("diffGap", { n: hunk.count }) : `#${index + 1}`;
    btn.addEventListener("click", () => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return btn;
  }
  function hunkTone(hunk) {
    if (hunk.kind === "gap") {
      return "quiet";
    }
    let add = false;
    let del = false;
    for (const row of hunk.rows) {
      if (row.type === "add" || row.type === "replace") {
        add = true;
      }
      if (row.type === "del" || row.type === "replace") {
        del = true;
      }
    }
    if (add && del) {
      return "mix";
    }
    if (add) {
      return "add";
    }
    if (del) {
      return "del";
    }
    return "quiet";
  }
  function hunkEl(fileId, index, hunk) {
    if (hunk.kind === "gap") {
      const id = `${fileId}:${index}`;
      const wrap = document.createElement("div");
      wrap.className = "gap";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gap-btn";
      btn.innerHTML = `<span class="mark">${iconStar()}</span>${escapeHtml(tr("diffGap", { n: hunk.count }))}`;
      const inner = document.createElement("div");
      inner.hidden = !openGaps.has(id);
      if (openGaps.has(id) && hunk.rows.length) {
        inner.append(rowsEl(hunk.rows));
      }
      btn.addEventListener("click", () => {
        if (openGaps.has(id)) {
          openGaps.delete(id);
        } else {
          openGaps.add(id);
        }
        const show = openGaps.has(id);
        if (show && !inner.firstChild && hunk.rows.length) {
          inner.append(rowsEl(hunk.rows));
        }
        inner.hidden = !show;
        wrap.classList.toggle("open", show);
      });
      wrap.append(btn, inner);
      return wrap;
    }
    return rowsEl(hunk.rows);
  }
  function splitPath(filePath) {
    const norm = filePath.replace(/\\/g, "/");
    const at = norm.lastIndexOf("/");
    if (at < 0) {
      return { dir: "", name: norm };
    }
    return { dir: norm.slice(0, at), name: norm.slice(at + 1) };
  }
  var ROW_PAGE = 200;
  function rowsEl(rows) {
    const wrap = document.createElement("div");
    const el = document.createElement("div");
    el.className = unified ? "rows unified" : "rows split";
    wrap.append(el);
    let shown = 0;
    const more = document.createElement("button");
    more.type = "button";
    more.className = "more-rows";
    const paint = (count) => {
      const end = Math.min(rows.length, shown + count);
      const frag = document.createDocumentFragment();
      for (let i = shown; i < end; i += 1) {
        const row = rows[i];
        if (!row) {
          continue;
        }
        frag.append(unified ? unifiedRow(row) : splitRow(row));
      }
      el.append(frag);
      shown = end;
      if (shown >= rows.length) {
        more.remove();
        return;
      }
      more.textContent = tr("diffMore", { n: rows.length - shown });
      if (!more.isConnected) {
        wrap.append(more);
      }
    };
    more.addEventListener("click", () => paint(ROW_PAGE));
    paint(ROW_PAGE);
    return wrap;
  }
  function splitRow(row) {
    const el = document.createElement("div");
    el.className = `pair ${row.type}`;
    const leftKind = row.type === "add" ? "ghost" : row.type === "replace" ? "del" : row.type;
    const rightKind = row.type === "del" ? "ghost" : row.type === "replace" ? "add" : row.type;
    el.append(
      cell("before", leftKind, row.beforeNo, row.beforeText),
      cell("after", rightKind, row.afterNo, row.afterText)
    );
    return el;
  }
  function unifiedRow(row) {
    if (row.type === "replace") {
      const wrap = document.createElement("div");
      wrap.append(
        unifiedLine("del", row.beforeNo, row.beforeText),
        unifiedLine("add", row.afterNo, row.afterText)
      );
      return wrap;
    }
    return unifiedLine(row.type, row.type === "add" ? row.afterNo : row.beforeNo, row.type === "add" ? row.afterText : row.beforeText);
  }
  function unifiedLine(type, no, text) {
    const el = document.createElement("div");
    el.className = `uni ${type}`;
    const sign = type === "add" ? "+" : type === "del" ? "\u2212" : "\xB7";
    el.innerHTML = `<span class="no">${no ?? ""}</span><span class="sign">${sign}</span><pre>${escapeHtml(text ?? "")}</pre>`;
    return el;
  }
  function cell(side, kind, no, text) {
    const el = document.createElement("div");
    el.className = `cell ${side} ${kind}`;
    const num = document.createElement("span");
    num.className = "no";
    num.textContent = no ? String(no) : "";
    const pre = document.createElement("pre");
    pre.textContent = text ?? "";
    el.append(num, pre);
    return el;
  }
  function iconStar() {
    return '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 1.1 14.35 9.65 22.9 12 14.35 14.35 12 22.9 9.65 14.35 1.1 12 9.65 9.65z"/></svg>';
  }
  function iconChevron() {
    return '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 6l4 4 4-4"/></svg>';
  }
  function escapeHtml(value) {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  vscode.postMessage({ type: "ready" });
})();
//# sourceMappingURL=diff.js.map
