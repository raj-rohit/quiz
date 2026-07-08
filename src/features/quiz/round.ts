// Pure round-lifecycle logic: when a round ends and how it is scored.
import { computeScore } from './score';

export interface RoundResult {
  correct: boolean;
  timeSec: number;
}

export interface RoundSummaryData {
  correct: number;
  total: number;
  scorePct: number;
}

/** True when `index` is the final question of the deck (round ends, no wrap-around). */
export const isLastQuestion = (index: number, deckLength: number): boolean =>
  deckLength > 0 && index >= deckLength - 1;

/** Tally a finished round: correct count + average per-question score (wrong answers score 0). */
export const summarizeRound = (results: RoundResult[]): RoundSummaryData => {
  const total = results.length;
  if (!total) return { correct: 0, total: 0, scorePct: 0 };
  const correct = results.filter((r) => r.correct).length;
  const sum = results.reduce((acc, r) => acc + (r.correct ? computeScore(r.timeSec) : 0), 0);
  return { correct, total, scorePct: Math.round(sum / total) };
};
