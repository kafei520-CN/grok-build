import type { ChatState, WebviewToHost } from '../types';
import { t, type StringKey, type UiLocale } from '../i18n';
import { normalizeTheme } from '../theme';

type VsCodeApi = {
  postMessage(message: WebviewToHost): void;
  getState(): unknown;
  setState(state: unknown): void;
};

function getVsCodeApi(): VsCodeApi {
  const acquire = (
    window as unknown as { acquireVsCodeApi?: () => VsCodeApi }
  ).acquireVsCodeApi;
  if (!acquire) {
    throw new Error('acquireVsCodeApi is not available');
  }
  return acquire();
}

export const vscode = getVsCodeApi();
export const root = document.getElementById('app') ?? document.body;

export const ui = {
  state: prefsOnly(vscode.getState()),
  sessionsMode: readSessionsMode(vscode.getState()),
  draft: '',
  menu: undefined as 'slash' | 'files' | undefined,
  picker: undefined as 'model' | 'effort' | undefined,
  composerFocused: false,
  moreOpen: false,
  dashDraft: '',
  dashTarget: undefined as string | undefined,
  agentsTab: 'agents' as 'agents' | 'personas',
  editsExpanded: new Set<string>(),
  copiedId: undefined as string | undefined,
  copiedTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  workOpen: new Map<string, boolean>(),
  stepsOpen: new Map<string, boolean>(),
  sessionGroupOpen: new Map<string, boolean>(),
  permissionOpen: new Map<string, boolean>(),
  askOpen: new Map<string, boolean>(),
  askOtherOpen: false,
  askOtherDraft: '',
  askPicked: new Set<string>(),
  askPickStamp: '',
  lightboxSrc: undefined as string | undefined,
  stickToBottom: true,
  transcriptScroll: 0,
  composer: undefined as HTMLTextAreaElement | undefined,
  wantFocus: false,
};

export function loc(): UiLocale {
  return ui.state.locale === 'zh-CN' ? 'zh-CN' : 'en';
}

export function tr(key: StringKey, vars?: Record<string, string | number>): string {
  return t(loc(), key, vars);
}

export function post(message: WebviewToHost): void {
  vscode.postMessage(message);
}

export function emptyState(): ChatState {
  return {
    status: 'connecting',
    messages: [],
    attachments: [],
    commands: [],
    locale: 'en',
  };
}

export function isBooting(): boolean {
  return ui.state.status === 'connecting';
}

let prefsToken = '';

export function persistUi(): void {
  const theme = normalizeTheme(ui.state.theme);
  const next = JSON.stringify({
    locale: ui.state.locale,
    compactMode: ui.state.compactMode,
    timestamps: ui.state.timestamps,
    multiline: ui.state.multiline,
    sessionsMode: ui.sessionsMode,
    theme,
  });
  if (next === prefsToken) {
    return;
  }
  prefsToken = next;
  vscode.setState({
    locale: ui.state.locale,
    compactMode: ui.state.compactMode,
    timestamps: ui.state.timestamps,
    multiline: ui.state.multiline,
    sessionsMode: ui.sessionsMode,
    theme,
  });
}

function readSessionsMode(raw: unknown): 'list' | 'workspace' {
  if (raw && typeof raw === 'object' && (raw as { sessionsMode?: string }).sessionsMode === 'workspace') {
    return 'workspace';
  }
  return 'list';
}

function prefsOnly(raw: unknown): ChatState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const value = raw as Partial<ChatState>;
  return {
    ...base,
    locale: value.locale === 'zh-CN' ? 'zh-CN' : 'en',
    compactMode: value.compactMode,
    timestamps: value.timestamps,
    multiline: value.multiline,
    theme: normalizeTheme((value as { theme?: unknown }).theme),
  };
}

export function normalizeState(raw: unknown): ChatState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const value = raw as Partial<ChatState>;
  return {
    ...base,
    ...value,
    messages: Array.isArray(value.messages) ? value.messages : [],
    attachments: Array.isArray(value.attachments) ? value.attachments : [],
    commands: Array.isArray(value.commands) ? value.commands : [],
    locale: value.locale === 'zh-CN' ? 'zh-CN' : 'en',
  };
}

export function canType(): boolean {
  const status = ui.state.status;
  return status === 'ready' || status === 'error' || status === 'streaming';
}

export function canSend(): boolean {
  return canType();
}

export function turnBusy(): boolean {
  return ui.state.status === 'streaming';
}

let paint = (): void => {};

export function bindRender(fn: () => void): void {
  paint = fn;
}

export function render(): void {
  paint();
}
