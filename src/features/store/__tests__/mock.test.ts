jest.mock('@/src/lib/storage', () => {
  const mem = new Map<string, unknown>();
  return {
    loadJSON: jest.fn(async (key: string, fallback: unknown) => (mem.has(key) ? mem.get(key) : fallback)),
    saveJSON: jest.fn(async (key: string, value: unknown) => {
      mem.set(key, value);
    }),
    KEYS: { owned: 'll.owned' },
    __mem: mem,
  };
});

import { MockStoreAdapter, ownedAfterMockPurchase } from '../mock';

const PAID = ['food', 'eighties', 'sport', 'retro'];

beforeEach(() => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.clear();
});

test('ownedAfterMockPurchase maps a pack sku to its pack id', () => {
  expect(ownedAfterMockPurchase('sku_food', [])).toEqual(['food']);
  expect(ownedAfterMockPurchase('sku_food', ['food'])).toEqual(['food']);
});

test('ownedAfterMockPurchase maps the bundle sku to all paid ids', () => {
  expect(ownedAfterMockPurchase('sku_allaccess', ['food'])!.sort()).toEqual(PAID.slice().sort());
});

test('ownedAfterMockPurchase returns null for unknown skus', () => {
  expect(ownedAfterMockPurchase('sku_nope', [])).toBeNull();
});

test('getProducts returns localized mock prices for known skus only', async () => {
  const adapter = new MockStoreAdapter(0);
  const products = await adapter.getProducts(['sku_food', 'sku_allaccess', 'sku_nope']);
  expect(products).toEqual([
    { sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
    { sku: 'sku_allaccess', priceString: '€7,99', price: 7.99, currencyCode: 'EUR' },
  ]);
});

test('purchase persists ownership and restore/getOwnedPackIds read it back', async () => {
  const adapter = new MockStoreAdapter(0);
  await adapter.init();
  const res = await adapter.purchase('sku_sport');
  expect(res).toEqual({ outcome: 'success', ownedPackIds: ['sport'] });
  expect(await adapter.getOwnedPackIds()).toEqual(['sport']);
  expect(await adapter.restore()).toEqual(['sport']);
});

test('purchase of an unknown sku fails without changing ownership', async () => {
  const adapter = new MockStoreAdapter(0);
  const res = await adapter.purchase('sku_nope');
  expect(res).toEqual({ outcome: 'failed' });
  expect(await adapter.getOwnedPackIds()).toEqual([]);
});
