import { computeOwnedAfterBuy } from '../entitlements';

const PAID = ['food', 'eighties', 'sport', 'retro'];

test('buying a pack adds its id once (idempotent)', () => {
  expect(computeOwnedAfterBuy([], 'food', PAID, false)).toEqual(['food']);
  expect(computeOwnedAfterBuy(['food'], 'food', PAID, false)).toEqual(['food']);
});

test('buying the bundle adds all paid ids', () => {
  expect(computeOwnedAfterBuy(['food'], 'allaccess', PAID, true).sort()).toEqual(PAID.slice().sort());
});
