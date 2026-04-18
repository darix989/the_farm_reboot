import type { LogicalFallacy, Sentence } from '../../../types/debateEntities';
import type { GuessRecord } from './fallacyGuessTypes';

export function pairKey(sentenceId: string, fallacyId: string): string {
  return `${sentenceId}\u001f${fallacyId}`;
}

export function incrementPairCount(m: Map<string, number>, sentenceId: string, fallacyId: string) {
  const k = pairKey(sentenceId, fallacyId);
  m.set(k, (m.get(k) ?? 0) + 1);
}

export function truthMultisetFromSentences(sentences: Sentence[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sentences) {
    for (const f of s.logicalFallacies) {
      incrementPairCount(m, s.id, f.id);
    }
  }
  return m;
}

export function guessMultisetFromPicks(
  picks: { sentenceId: string; fallacyId: string }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of picks) {
    incrementPairCount(m, p.sentenceId, p.fallacyId);
  }
  return m;
}

export function multisetsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if ((b.get(k) ?? 0) !== v) return false;
  }
  return true;
}

export function hasCorrectPairOverlap(
  truth: Map<string, number>,
  guess: Map<string, number>,
): boolean {
  for (const [k, tv] of truth) {
    const gv = guess.get(k) ?? 0;
    if (tv > 0 && gv > 0) return true;
  }
  return false;
}

export function computeMissedPairs(
  sentences: Sentence[],
  truth: Map<string, number>,
  guess: Map<string, number>,
  fallacyById: Map<string, LogicalFallacy>,
): { sentenceId: string; fallacy: LogicalFallacy }[] {
  const missed: { sentenceId: string; fallacy: LogicalFallacy }[] = [];
  const sentenceById = new Map(sentences.map((s) => [s.id, s]));
  for (const [k, tCount] of truth) {
    const gCount = guess.get(k) ?? 0;
    const missedCount = tCount - Math.min(tCount, gCount);
    if (missedCount <= 0) continue;
    const sep = k.indexOf('\u001f');
    if (sep < 0) continue;
    const sentenceId = k.slice(0, sep);
    const fallacyId = k.slice(sep + 1);
    const sentence = sentenceById.get(sentenceId);
    const hasFallacyInSentence = sentence?.logicalFallacies.some((x) => x.id === fallacyId);
    const f = fallacyById.get(fallacyId);
    if (!hasFallacyInSentence || !f) continue;
    for (let i = 0; i < missedCount; i++) {
      missed.push({ sentenceId, fallacy: f });
    }
  }
  return missed;
}

/** Multiset intersection: how many of each (sentence, fallacy) pair are correct in this guess. */
export function correctIntersectionMultiset(
  truth: Map<string, number>,
  guess: Map<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [k, tv] of truth) {
    const gv = guess.get(k) ?? 0;
    const c = Math.min(tv, gv);
    if (c > 0) out.set(k, c);
  }
  return out;
}

export function multisetToPairList(
  m: Map<string, number>,
): { sentenceId: string; fallacyId: string }[] {
  const out: { sentenceId: string; fallacyId: string }[] = [];
  for (const [k, count] of m) {
    const sep = k.indexOf('\u001f');
    if (sep < 0) continue;
    const sentenceId = k.slice(0, sep);
    const fallacyId = k.slice(sep + 1);
    for (let i = 0; i < count; i++) {
      out.push({ sentenceId, fallacyId });
    }
  }
  return out;
}

export function picksToBySentence(
  picks: { sentenceId: string; fallacyId: string }[],
): Record<string, string[]> {
  const acc: Record<string, string[]> = {};
  for (const p of picks) {
    if (!acc[p.sentenceId]) acc[p.sentenceId] = [];
    if (!acc[p.sentenceId].includes(p.fallacyId)) acc[p.sentenceId].push(p.fallacyId);
  }
  return acc;
}

/** Like picksToBySentence but keeps duplicate fallacy ids per sentence (multiset). */
export function pairListToBySentence(
  pairs: { sentenceId: string; fallacyId: string }[],
): Record<string, string[]> {
  const acc: Record<string, string[]> = {};
  for (const p of pairs) {
    if (!acc[p.sentenceId]) acc[p.sentenceId] = [];
    acc[p.sentenceId].push(p.fallacyId);
  }
  return acc;
}

/**
 * Per key k: min(T[k], max over multi attempts of min(T[k], G_t[k])).
 * no_fallacies attempts do not contribute pairs.
 */
export function pinnedMultisetFromAttempts(
  truth: Map<string, number>,
  attempts: GuessRecord[],
): Map<string, number> {
  const pinned = new Map<string, number>();
  for (const att of attempts) {
    if (att.kind !== 'multi') continue;
    const g = guessMultisetFromPicks(att.picks);
    const inter = correctIntersectionMultiset(truth, g);
    for (const [k, v] of inter) {
      const tv = truth.get(k) ?? 0;
      const prev = pinned.get(k) ?? 0;
      pinned.set(k, Math.min(tv, Math.max(prev, v)));
    }
  }
  return pinned;
}

export function isGuessTerminal(record: GuessRecord): boolean {
  if (record.kind === 'no_fallacies') return record.correct;
  return record.outcome === 'perfect';
}

export function isSessionTerminal(session: { attempts: GuessRecord[] }): boolean {
  const last = session.attempts[session.attempts.length - 1];
  return !!last && isGuessTerminal(last);
}

export function shouldRevealFullSolution(session: {
  maxAttempts: number;
  attempts: GuessRecord[];
}): boolean {
  return session.attempts.length >= session.maxAttempts && !isSessionTerminal(session);
}

export function guessStateForRecord(record: GuessRecord): 'correct' | 'partial' | 'wrong' {
  if (record.kind === 'no_fallacies') return record.correct ? 'correct' : 'wrong';
  if (record.outcome === 'perfect') return 'correct';
  if (record.outcome === 'partial') return 'partial';
  return 'wrong';
}

/** Best badge state across all attempts in a session (for AnalyzeButton). */
export function guessStateFromAttempts(
  attempts: GuessRecord[],
): 'correct' | 'partial' | 'wrong' | null {
  if (attempts.length === 0) return null;
  let best: 'correct' | 'partial' | 'wrong' = 'wrong';
  for (const a of attempts) {
    const s = guessStateForRecord(a);
    if (s === 'correct') return 'correct';
    if (s === 'partial') best = 'partial';
  }
  return best;
}
