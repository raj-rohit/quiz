import { computeBundleSavings, formatAmount } from '../savings';
import type { StoreProduct } from '../adapter';

const P = (sku: string, price: number): StoreProduct => ({
  sku,
  priceString: `x`,
  price,
  currencyCode: 'EUR',
});

const PACK_SKUS = ['sku_food', 'sku_eighties', 'sku_sport', 'sku_retro'];
const ALL = [P('sku_food', 2.99), P('sku_eighties', 2.99), P('sku_sport', 1.99), P('sku_retro', 3.99), P('sku_allaccess', 7.99)];

test('formatAmount falls back to code + amount for bogus currencies', () => {
  expect(formatAmount(11.96, 'NOPE!')).toBe('NOPE! 11.96');
});

test('savings from the mock price book: €11,96 regular, save 33%', () => {
  const s = computeBundleSavings(ALL, PACK_SKUS, 'sku_allaccess');
  expect(s).not.toBeNull();
  expect(s!.savePct).toBe(33);
  expect(s!.regular).toBe(formatAmount(11.96, 'EUR'));
});

test('returns null when any pack or the bundle product is missing', () => {
  expect(computeBundleSavings(ALL.slice(0, 3), PACK_SKUS, 'sku_allaccess')).toBeNull();
  expect(computeBundleSavings(ALL.slice(0, 4), PACK_SKUS, 'sku_allaccess')).toBeNull();
  expect(computeBundleSavings(ALL, PACK_SKUS, undefined)).toBeNull();
  expect(computeBundleSavings(ALL.filter((p) => p.sku !== 'sku_retro'), PACK_SKUS, 'sku_allaccess')).toBeNull();
});

test('returns null when the bundle is not actually cheaper', () => {
  const notCheaper = [P('sku_food', 1.0), P('sku_eighties', 1.0), P('sku_sport', 1.0), P('sku_retro', 1.0), P('sku_allaccess', 4.5)];
  expect(computeBundleSavings(notCheaper, PACK_SKUS, 'sku_allaccess')).toBeNull();
});
