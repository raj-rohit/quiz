import { computeScore, normalizeAnswer } from '../score';

test('a fast answer scores 100', () => {
  expect(computeScore(4)).toBe(100);
});

test('100 up to 10s, then -2/sec, floored at 50', () => {
  expect(computeScore(10)).toBe(100);
  expect(computeScore(20)).toBe(80);
  expect(computeScore(100)).toBe(50);
});

test('normalize strips accents, case and punctuation', () => {
  expect(normalizeAnswer('Crème-Brûlée!')).toBe('cremebrulee');
  expect(normalizeAnswer('  Amstel ')).toBe('amstel');
  expect(normalizeAnswer('AH')).toBe('ah');
});
