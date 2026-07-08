import { isLastQuestion, summarizeRound } from '../round';

describe('isLastQuestion', () => {
  it('is false mid-deck', () => {
    expect(isLastQuestion(0, 5)).toBe(false);
    expect(isLastQuestion(3, 5)).toBe(false);
  });

  it('is true on the final question so the round ends instead of looping', () => {
    expect(isLastQuestion(4, 5)).toBe(true);
  });

  it('is false for an empty deck', () => {
    expect(isLastQuestion(0, 0)).toBe(false);
  });
});

describe('summarizeRound', () => {
  it('counts correct answers and averages per-question scores', () => {
    // computeScore: 100 up to 10s, then -2/sec → 8s = 100, 15s = 90; wrong = 0.
    const summary = summarizeRound([
      { correct: true, timeSec: 8 },
      { correct: true, timeSec: 15 },
      { correct: false, timeSec: 20 },
    ]);
    expect(summary.correct).toBe(2);
    expect(summary.total).toBe(3);
    expect(summary.scorePct).toBe(Math.round((100 + 90 + 0) / 3));
  });

  it('handles an empty round without dividing by zero', () => {
    expect(summarizeRound([])).toEqual({ correct: 0, total: 0, scorePct: 0 });
  });
});
