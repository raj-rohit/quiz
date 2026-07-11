import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('@/src/features/catalog/useCatalog', () => ({
  useCatalog: () => ({ catalog: jest.requireActual('@/src/features/catalog/catalog').OFFLINE_CATALOG }),
}));

// ProductsContext statically imports the store barrel (for getReadyStoreAdapter),
// which pulls in the mock adapter's `@/src/lib/storage` import even when this test
// always supplies its own `adapter` prop. Mocked here for the same reason
// src/features/store/__tests__/{mock,select}.test.ts mock it: jest-expo doesn't
// stub the native AsyncStorage module, so the real one throws under Jest.
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

import { ProductsProvider, useProducts } from '../ProductsContext';
import type { StoreAdapter } from '@/src/features/store/adapter';

const fakeAdapter: StoreAdapter = {
  init: jest.fn(async () => {}),
  getProducts: jest.fn(async (skus: string[]) =>
    [
      { sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
      { sku: 'sku_eighties', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
      { sku: 'sku_sport', priceString: '€1,99', price: 1.99, currencyCode: 'EUR' },
      { sku: 'sku_retro', priceString: '€3,99', price: 3.99, currencyCode: 'EUR' },
      { sku: 'sku_allaccess', priceString: '€7,99', price: 7.99, currencyCode: 'EUR' },
    ].filter((p) => skus.includes(p.sku))
  ),
  purchase: jest.fn(),
  restore: jest.fn(async () => []),
  getOwnedPackIds: jest.fn(async () => []),
};

let api!: ReturnType<typeof useProducts>;
function Probe() {
  api = useProducts();
  return null;
}

test('exposes fetched prices and bundle savings', async () => {
  await act(async () => {
    create(
      <ProductsProvider adapter={fakeAdapter}>
        <Probe />
      </ProductsProvider>
    );
  });
  expect(api.getPrice('sku_food')).toBe('€2,99');
  expect(api.getPrice(undefined)).toBe('');
  expect(api.getPrice('sku_ghost')).toBe('');
  expect(api.bundleSavings?.savePct).toBe(33);
  expect(fakeAdapter.getProducts).toHaveBeenCalledWith([
    'sku_food',
    'sku_eighties',
    'sku_sport',
    'sku_retro',
    'sku_allaccess',
  ]);
});

test('refetches prices when the app returns to the foreground', async () => {
  const { AppState } = jest.requireActual('react-native');
  let handler: ((state: string) => void) | undefined;
  const subscribe = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, cb: (state: string) => void) => {
    handler = cb;
    return { remove: jest.fn() };
  }) as never);

  await act(async () => {
    create(
      <ProductsProvider adapter={fakeAdapter}>
        <Probe />
      </ProductsProvider>
    );
  });
  const calls = (fakeAdapter.getProducts as jest.Mock).mock.calls.length;
  expect(handler).toBeDefined();

  await act(async () => {
    handler!('background');
  });
  expect((fakeAdapter.getProducts as jest.Mock).mock.calls.length).toBe(calls);

  await act(async () => {
    handler!('active');
  });
  expect((fakeAdapter.getProducts as jest.Mock).mock.calls.length).toBe(calls + 1);

  subscribe.mockRestore();
});

test('prices stay empty and savings null when fetching fails', async () => {
  const broken: StoreAdapter = { ...fakeAdapter, getProducts: jest.fn(async () => Promise.reject(new Error('offline'))) };
  await act(async () => {
    create(
      <ProductsProvider adapter={broken}>
        <Probe />
      </ProductsProvider>
    );
  });
  expect(api.getPrice('sku_food')).toBe('');
  expect(api.bundleSavings).toBeNull();
});
