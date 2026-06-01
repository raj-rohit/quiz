// Pure local-progress logic — no RN imports.

export interface Progress {
  solved: number;
  streak: number;
  lastDay: string | null; // YYYY-MM-DD
  bestTimeSec: number | null;
  byPack: Record<string, number>;
}

export interface QuizResult {
  packId: string;
  correct: boolean;
  timeSec: number;
}

export const emptyProgress = (): Progress => ({
  solved: 0,
  streak: 0,
  lastDay: null,
  bestTimeSec: null,
  byPack: {},
});

/** Streak: 1 on first play or after a gap (>1 day); +1 on the next day; unchanged same day. */
export function computeStreak(prevDay: string | null, today: string, prevStreak: number): number {
  if (!prevDay) return 1;
  if (prevDay === today) return prevStreak || 1;
  const diffDays = Math.round((Date.parse(today) - Date.parse(prevDay)) / 86400000);
  return diffDays === 1 ? prevStreak + 1 : 1;
}

export function applyResult(p: Progress, r: QuizResult, today: string): Progress {
  const streak = computeStreak(p.lastDay, today, p.streak);
  if (!r.correct) return { ...p, streak, lastDay: today };
  return {
    ...p,
    solved: p.solved + 1,
    streak,
    lastDay: today,
    bestTimeSec: p.bestTimeSec == null ? r.timeSec : Math.min(p.bestTimeSec, r.timeSec),
    byPack: { ...p.byPack, [r.packId]: (p.byPack[r.packId] ?? 0) + 1 },
  };
}
