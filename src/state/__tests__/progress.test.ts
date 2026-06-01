import { applyResult, computeStreak, emptyProgress } from '../progress';

test('a correct answer updates solved, best time and per-pack count', () => {
  const p = applyResult(emptyProgress(), { packId: 'classics', correct: true, timeSec: 4 }, '2026-06-01');
  expect(p.solved).toBe(1);
  expect(p.bestTimeSec).toBe(4);
  expect(p.byPack.classics).toBe(1);
});

test('a give-up (incorrect) does not increment solved', () => {
  const p = applyResult(emptyProgress(), { packId: 'classics', correct: false, timeSec: 9 }, '2026-06-01');
  expect(p.solved).toBe(0);
  expect(p.bestTimeSec).toBeNull();
});

test('best time only improves', () => {
  let p = applyResult(emptyProgress(), { packId: 'x', correct: true, timeSec: 8 }, '2026-06-01');
  p = applyResult(p, { packId: 'x', correct: true, timeSec: 12 }, '2026-06-01');
  expect(p.bestTimeSec).toBe(8);
});

test('streak increments on a consecutive day and resets after a gap', () => {
  let p = applyResult(emptyProgress(), { packId: 'x', correct: true, timeSec: 2 }, '2026-06-01');
  expect(p.streak).toBe(1);
  p = applyResult(p, { packId: 'x', correct: true, timeSec: 2 }, '2026-06-02');
  expect(p.streak).toBe(2);
  p = applyResult(p, { packId: 'x', correct: true, timeSec: 2 }, '2026-06-05');
  expect(p.streak).toBe(1);
});

test('same-day plays keep the streak', () => {
  expect(computeStreak('2026-06-01', '2026-06-01', 3)).toBe(3);
});
