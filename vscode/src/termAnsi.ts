/** Fold CR progress lines and keep SGR; used before painting. */
export function foldCarriageReturns(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[^\n]*\r/g, '');
}

/** Escape + map common SGR codes so the webview can paint a terminal body. */
export function renderTermHtml(raw: string): string {
  const text = foldCarriageReturns(raw).replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '');
  let html = '';
  let open = false;
  let style: TermStyle = emptyStyle();
  const close = (): void => {
    if (open) {
      html += '</span>';
      open = false;
    }
  };
  const apply = (): void => {
    close();
    const tag = styleTag(style);
    if (tag) {
      html += tag;
      open = true;
    }
  };
  let i = 0;
  while (i < text.length) {
    if (text.charCodeAt(i) === 0x1b && text[i + 1] === '[') {
      const end = text.indexOf('m', i + 2);
      if (end < 0) {
        html += escapeTerm(text.slice(i));
        break;
      }
      style = nextStyle(style, text.slice(i + 2, end));
      apply();
      i = end + 1;
      continue;
    }
    if (text.charCodeAt(i) === 0x1b) {
      i += text[i + 1] ? 2 : 1;
      continue;
    }
    let j = i + 1;
    while (j < text.length && text.charCodeAt(j) !== 0x1b) {
      j += 1;
    }
    html += escapeTerm(text.slice(i, j));
    i = j;
  }
  close();
  return html;
}

type TermStyle = {
  bold: boolean;
  dim: boolean;
  underline: boolean;
  fg?: number;
  bg?: number;
};

function emptyStyle(): TermStyle {
  return { bold: false, dim: false, underline: false };
}

function nextStyle(prev: TermStyle, params: string): TermStyle {
  const codes = params.split(';').map((item) => Number(item) || 0);
  let next = { ...prev };
  for (let i = 0; i < codes.length; i += 1) {
    const code = codes[i] ?? 0;
    if (code === 0) {
      next = emptyStyle();
      continue;
    }
    if (code === 1) {
      next.bold = true;
      continue;
    }
    if (code === 2) {
      next.dim = true;
      continue;
    }
    if (code === 4) {
      next.underline = true;
      continue;
    }
    if (code === 22) {
      next.bold = false;
      next.dim = false;
      continue;
    }
    if (code === 24) {
      next.underline = false;
      continue;
    }
    if (code === 39) {
      next.fg = undefined;
      continue;
    }
    if (code === 49) {
      next.bg = undefined;
      continue;
    }
    if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
      next.fg = code;
      continue;
    }
    if (code >= 40 && code <= 47) {
      next.bg = code;
      continue;
    }
    if (code >= 100 && code <= 107) {
      next.bg = code - 60;
      continue;
    }
    if ((code === 38 || code === 48) && codes[i + 1] === 5) {
      i += 2;
    } else if ((code === 38 || code === 48) && codes[i + 1] === 2) {
      i += 4;
    }
  }
  return next;
}

function styleTag(style: TermStyle): string {
  const cls = [
    style.bold ? 't-b' : '',
    style.dim ? 't-d' : '',
    style.underline ? 't-u' : '',
    style.fg !== undefined ? `t-fg-${style.fg}` : '',
    style.bg !== undefined ? `t-bg-${style.bg}` : '',
  ].filter(Boolean);
  if (!cls.length) {
    return '';
  }
  return `<span class="${cls.join(' ')}">`;
}

function escapeTerm(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
