import type { GrokSettings, PermissionOption } from './types';

export function sessionPermissionMeta(settings: Pick<GrokSettings, 'alwaysApprove' | 'permissionMode'>): {
  yoloMode: boolean;
  autoMode: boolean;
} {
  const yoloMode = Boolean(settings.alwaysApprove);
  return {
    yoloMode,
    autoMode: !yoloMode && settings.permissionMode === 'auto',
  };
}

export function isEditToolKind(kind?: string): boolean {
  const value = (kind ?? '').toLowerCase();
  return value === 'edit' || value === 'write' || value === 'delete' || value === 'move';
}

export function pickAllowOption(options: PermissionOption[]): PermissionOption | undefined {
  return (
    options.find((option) => option.kind === 'allow_once') ??
    options.find((option) => option.kind === 'allow_always') ??
    options.find((option) => option.kind.startsWith('allow')) ??
    options[0]
  );
}

export function shouldAutoApprove(
  settings: Pick<GrokSettings, 'alwaysApprove' | 'permissionMode'>,
  toolKind?: string,
): boolean {
  if (settings.alwaysApprove || settings.permissionMode === 'auto') {
    return true;
  }
  return settings.permissionMode === 'acceptEdits' && isEditToolKind(toolKind);
}

export function selectedPermission(optionId: string): unknown {
  return { outcome: { outcome: 'selected', optionId } };
}

export type PermLabelKey =
  | 'permAllowOnce'
  | 'permAllowAlways'
  | 'permAllowEditsSession'
  | 'permReject'
  | 'permRejectTell';

export function normalizePermissionKind(kind: string): string {
  return kind
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

export function permissionLabelKey(
  option: Pick<PermissionOption, 'kind' | 'name'>,
  toolKind?: string,
): PermLabelKey {
  const kind = normalizePermissionKind(option.kind);
  if (kind === 'allow_always') {
    return isEditToolKind(toolKind) ? 'permAllowEditsSession' : 'permAllowAlways';
  }
  if (kind === 'allow_once' || kind.startsWith('allow')) {
    return 'permAllowOnce';
  }
  const name = (option.name ?? '').toLowerCase();
  if (name.includes('tell') || name.includes('differently')) {
    return 'permRejectTell';
  }
  return kind === 'reject_always' ? 'permReject' : 'permRejectTell';
}

export function permissionButtonClass(kind: string): string {
  const value = normalizePermissionKind(kind);
  if (value === 'allow_once') {
    return 'btn primary';
  }
  if (value.startsWith('allow')) {
    return 'btn allow';
  }
  return 'btn reject';
}
