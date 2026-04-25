export const TUTORIAL_RICH_TONES = [
  'accent',
  'danger',
  'warning',
  'success',
  'info',
  'muted',
] as const;
export type TutorialRichTone = (typeof TUTORIAL_RICH_TONES)[number];

const TONE_SET = new Set<string>(TUTORIAL_RICH_TONES);

export type RichNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: RichNode[] }
  | { type: 'tone'; tone: TutorialRichTone; children: RichNode[] };

function slice(s: string, start: number, end: number): string {
  return s.slice(start, end);
}

/** First index of `needle` in [start, end), or -1. */
function indexOfBounded(s: string, needle: string, start: number, end: number): number {
  const idx = s.indexOf(needle, start);
  return idx === -1 || idx + needle.length > end ? -1 : idx;
}

function findClosingBold(s: string, from: number, end: number): number {
  return indexOfBounded(s, '**', from, end);
}

/**
 * Matching `[/tone]` for `[tone]`, accounting for nested `[tone]...[/tone]`.
 * Returns index of `[` starting the closing tag, or -1.
 */
function findClosingTone(s: string, tone: string, from: number, end: number): number {
  const open = `[${tone}]`;
  const close = `[/${tone}]`;
  let depth = 1;
  let i = from;
  while (i < end) {
    const nextOpen = indexOfBounded(s, open, i, end);
    const nextClose = indexOfBounded(s, close, i, end);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + open.length;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      i = nextClose + close.length;
    }
  }
  return -1;
}

function tryReadTag(
  s: string,
  i: number,
  end: number,
): { kind: 'open'; tone: TutorialRichTone; after: number } | null {
  if (s[i] !== '[') return null;
  const close = s.indexOf(']', i + 1);
  if (close === -1 || close >= end) return null;
  const inner = slice(s, i + 1, close);
  if (inner.startsWith('/')) return null;
  if (!TONE_SET.has(inner)) return null;
  return { kind: 'open', tone: inner as TutorialRichTone, after: close + 1 };
}

function tryReadCloseTag(
  s: string,
  i: number,
  end: number,
): { tone: TutorialRichTone; after: number } | null {
  if (s[i] !== '[' || i + 1 >= end || s[i + 1] !== '/') return null;
  const close = s.indexOf(']', i + 2);
  if (close === -1 || close >= end) return null;
  const inner = slice(s, i + 2, close);
  if (!TONE_SET.has(inner)) return null;
  return { tone: inner as TutorialRichTone, after: close + 1 };
}

function mergeAdjacentText(nodes: RichNode[]): RichNode[] {
  const out: RichNode[] = [];
  for (const n of nodes) {
    const prev = out[out.length - 1];
    if (n.type === 'text' && prev?.type === 'text') {
      prev.value += n.value;
    } else {
      out.push(n);
    }
  }
  return out;
}

/**
 * Parse inline rich text inside [start, end). Unmatched markup is left as literal characters.
 */
export function parseTutorialRichInline(s: string, start: number, end: number): RichNode[] {
  const nodes: RichNode[] = [];
  let i = start;
  let textStart = start;

  const flushText = (upto: number) => {
    if (upto > textStart) {
      const chunk = slice(s, textStart, upto);
      if (chunk.length > 0) {
        const last = nodes[nodes.length - 1];
        if (last?.type === 'text') {
          last.value += chunk;
        } else {
          nodes.push({ type: 'text', value: chunk });
        }
      }
    }
    textStart = upto;
  };

  while (i < end) {
    if (s[i] === '[' && i + 1 < end && s[i + 1] === '[') {
      flushText(i);
      const last = nodes[nodes.length - 1];
      if (last?.type === 'text') {
        last.value += '[';
      } else {
        nodes.push({ type: 'text', value: '[' });
      }
      i += 2;
      textStart = i;
      continue;
    }

    if (s[i] === '*' && i + 1 < end && s[i + 1] === '*') {
      flushText(i);
      const close = findClosingBold(s, i + 2, end);
      if (close === -1) {
        i += 1;
        continue;
      }
      nodes.push({ type: 'bold', children: parseTutorialRichInline(s, i + 2, close) });
      i = close + 2;
      textStart = i;
      continue;
    }

    const openTag = tryReadTag(s, i, end);
    if (openTag) {
      flushText(i);
      const closeIdx = findClosingTone(s, openTag.tone, openTag.after, end);
      if (closeIdx === -1) {
        i += 1;
        continue;
      }
      const closeTagLen = `[/${openTag.tone}]`.length;
      nodes.push({
        type: 'tone',
        tone: openTag.tone,
        children: parseTutorialRichInline(s, openTag.after, closeIdx),
      });
      i = closeIdx + closeTagLen;
      textStart = i;
      continue;
    }

    const closeTag = tryReadCloseTag(s, i, end);
    if (closeTag) {
      flushText(i);
      nodes.push({ type: 'text', value: slice(s, i, closeTag.after) });
      i = closeTag.after;
      textStart = i;
      continue;
    }

    i += 1;
  }

  flushText(end);
  return mergeAdjacentText(nodes);
}

/** Split on blank lines; trims only all-whitespace segments at the edges of each chunk. */
export function splitTutorialParagraphs(message: string): string[] {
  const parts = message.split(/\n\n+/);
  return parts.map((p) => p.replace(/^\n+|\n+$/g, '')).filter((p) => p.length > 0);
}
