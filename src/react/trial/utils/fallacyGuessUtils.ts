import type { LogicalFallacy, Sentence } from '../../../types/debateEntities';
import type { AnalysisGuessState, FallacyGuessSession, GuessRecord } from './fallacyGuessTypes';

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

/** Guess pairs that are not in the truth multiset (wrong tags or over-counts). */
export function computeExtraPairs(
  truth: Map<string, number>,
  guess: Map<string, number>,
  fallacyById: Map<string, LogicalFallacy>,
): { sentenceId: string; fallacy: LogicalFallacy }[] {
  const extras: { sentenceId: string; fallacy: LogicalFallacy }[] = [];
  for (const [k, gCount] of guess) {
    const tCount = truth.get(k) ?? 0;
    const extraCount = gCount - Math.min(tCount, gCount);
    if (extraCount <= 0) continue;
    const sep = k.indexOf('\u001f');
    if (sep < 0) continue;
    const sentenceId = k.slice(0, sep);
    const fallacyId = k.slice(sep + 1);
    const f = fallacyById.get(fallacyId);
    if (!f) continue;
    for (let i = 0; i < extraCount; i++) {
      extras.push({ sentenceId, fallacy: f });
    }
  }
  return extras;
}

/** Every truth pair was tagged, but the guess also has extras (or over-counts). */
export function isExtrasOnlyPartial(record: GuessRecord): boolean {
  return record.kind === 'multi' && record.outcome === 'partial' && record.missedPairs.length === 0;
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
  // TODO(analysis-extras): extras-only (`isExtrasOnlyPartial`) still fails this check —
  // it consumes an attempt and awards no Insight even though every truth pair was found.
  // Copy no longer asks the player to drop extras; decide whether a clean exact match
  // should remain required for a solve, or extras-only should count as success.
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

export function guessStateForRecord(record: GuessRecord): AnalysisGuessState {
  if (record.kind === 'no_fallacies') return record.correct ? 'correct' : 'wrong';
  if (record.outcome === 'perfect') return 'correct';
  if (record.outcome === 'partial') return isExtrasOnlyPartial(record) ? 'extras' : 'partial';
  return 'wrong';
}

/** Best badge state across all attempts in a session (for AnalyzeButton). */
export function guessStateFromAttempts(attempts: GuessRecord[]): AnalysisGuessState | null {
  if (attempts.length === 0) return null;
  let best: AnalysisGuessState = 'wrong';
  for (const a of attempts) {
    const s = guessStateForRecord(a);
    if (s === 'correct') return 'correct';
    if (s === 'extras') best = 'extras';
    else if (s === 'partial' && best !== 'extras') best = 'partial';
  }
  return best;
}

/**
 * Fallacies the player has correctly identified in this statement so far, cumulative across
 * every attempt in the session (same "pinned" pairs `RoundAnalysisModal` keeps highlighted
 * across retries) — one entry per distinct fallacy type, in the order it first appears in the
 * statement's sentences. Used to badge the Debate Log entry with the fallacies it holds.
 */
export function spottedFallacies(
  sentences: Sentence[],
  session: FallacyGuessSession | undefined,
  fallacyById: Map<string, LogicalFallacy>,
): LogicalFallacy[] {
  if (!session) return [];
  const truth = truthMultisetFromSentences(sentences);
  const pinned = pinnedMultisetFromAttempts(truth, session.attempts);
  const seen = new Set<string>();
  const result: LogicalFallacy[] = [];
  for (const s of sentences) {
    for (const f of s.logicalFallacies) {
      if (seen.has(f.id)) continue;
      if ((pinned.get(pairKey(s.id, f.id)) ?? 0) <= 0) continue;
      const full = fallacyById.get(f.id);
      if (!full) continue;
      seen.add(f.id);
      result.push(full);
    }
  }
  return result;
}
