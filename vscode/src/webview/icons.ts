export function iconClock(): string {
  return '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2 1.3"/></svg>';
}

export function iconGrid(): string {
  return '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2.5" y="2.5" width="4.4" height="4.4" rx="1"/><rect x="9.1" y="2.5" width="4.4" height="4.4" rx="1"/><rect x="2.5" y="9.1" width="4.4" height="4.4" rx="1"/><rect x="9.1" y="9.1" width="4.4" height="4.4" rx="1"/></svg>';
}

export function iconEdit(): string {
  return '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M9.2 3.4 12.6 6.8 6 13.4H2.6V10z"/></svg>';
}

export function iconPlus(): string {
  return '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 3.5v9M3.5 8h9"/></svg>';
}

export function iconStar(size = '100%'): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M12 1.1 14.35 9.65 22.9 12 14.35 14.35 12 22.9 9.65 14.35 1.1 12 9.65 9.65z"/></svg>`;
}

export function iconMore(): string {
  return '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><circle cx="4" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="12" cy="8" r="1.2"/></svg>';
}

export function iconStop(): string {
  return '<svg viewBox="0 0 16 16" width="10" height="10"><rect x="4" y="4" width="8" height="8" rx="1.2" fill="currentColor"/></svg>';
}

export function iconCopy(): string {
  return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3.8A1.3 1.3 0 0 0 9.2 2.5H3.8A1.3 1.3 0 0 0 2.5 3.8v5.4A1.3 1.3 0 0 0 3.8 10.5H5.5"/></svg>';
}

export function iconFork(): string {
  return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="4.5" cy="4" r="1.6"/><circle cx="4.5" cy="12" r="1.6"/><circle cx="11.5" cy="8" r="1.6"/><path d="M4.5 5.6v4.8M4.5 8h3.2c1.6 0 2.3.4 3.2 1.4"/></svg>';
}

export function iconCheck(): string {
  return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 8.2 6.6 11.2 12.5 4.8"/></svg>';
}

export function iconChevron(): string {
  return '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 6l4 4 4-4"/></svg>';
}

export function iconClose(): string {
  return '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
}

/** Circled inverted exclamation (¡) for option hints. */
export function iconAskHint(): string {
  return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="5.15" r="0.95" fill="currentColor" stroke="none"/><path d="M8 7.35v4.05" stroke-linecap="round"/></svg>';
}

export function iconBack(): string {
  return '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5 8l5 4.5"/></svg>';
}

export function iconFolder(): string {
  return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M2.4 4.6h4.1l1.3 1.5h5.8v6.7H2.4z"/><path d="M2.4 6.1h11.2"/></svg>';
}

export function iconTrash(): string {
  return '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M3.5 4.5h9M6.2 4.5V3.4h3.6v1.1M5.2 6.2v6.2M8 6.2v6.2M10.8 6.2v6.2M4.4 4.5l.6 8.4h6l.6-8.4"/></svg>';
}

export function toolIcon(kind?: string): string {
  switch (kind) {
    case 'edit':
    case 'write':
      return '✎';
    case 'read':
      return '▣';
    case 'execute':
    case 'terminal':
      return '▷';
    case 'search':
      return '⌕';
    case 'delete':
      return '⌫';
    default:
      return '⚙';
  }
}
