import React from 'react';
import { act, create } from 'react-test-renderer';

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

import { EntitlementsProvider, useEntitlements } from '../EntitlementsContext';
import type { StoreAdapter } from '@/src/features/store/adapter';

const adapterWith = (overrides: Partial<StoreAdapter> = {}): StoreAdapter => ({
  init: async () => {},
  getProducts: async () => [],
  purchase: async () => ({ outcome: 'success', ownedPackIds: ['food'] }),
  restore: async () => [],
  getOwnedPackIds: async () => [],
  ...overrides,
});

let api!: ReturnType<typeof useEntitlements>;
function Probe() {
  api = useEntitlements();
  return null;
}

const mount = async (adapter: StoreAdapter) => {
  await act(async () => {
    create(
      <EntitlementsProvider adapter={adapter}>
        <Probe />
      </EntitlementsProvider>
    );
  });
};

beforeEach(() => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.clear();
});

test('launch reconciles owned from the adapter and persists it', async () => {
  await mount(adapterWith({ getOwnedPackIds: async () => ['sport'] }));
  expect(api.owned).toEqual(['sport']);
  const { __mem } = jest.requireMock('@/src/lib/storage');
  expect(__mem.get('ll.owned')).toEqual(['sport']);
});

test('launch keeps the cached list when the adapter throws (offline)', async () => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.set('ll.owned', ['retro']);
  await mount(adapterWith({ getOwnedPackIds: async () => Promise.reject(new Error('offline')) }));
  expect(api.owned).toEqual(['retro']);
});

test('successful buy updates owned; cancelled/failed do not', async () => {
  await mount(adapterWith());
  await act(async () => {
    expect(await api.buy('sku_food')).toBe('success');
  });
  expect(api.owned).toEqual(['food']);

  await mount(adapterWith({ purchase: async () => ({ outcome: 'cancelled' }) }));
  await act(async () => {
    expect(await api.buy('sku_food')).toBe('cancelled');
  });
  expect(api.owned).toEqual([]);
});

test('buy without a sku fails fast', async () => {
  const purchase = jest.fn();
  await mount(adapterWith({ purchase }));
  await act(async () => {
    expect(await api.buy(undefined)).toBe('failed');
  });
  expect(purchase).not.toHaveBeenCalled();
});

test('buy resolves failed if an adapter ever rejects (stuck-sheet guard)', async () => {
  await mount(adapterWith({ purchase: async () => Promise.reject(new Error('boom')) }));
  await act(async () => {
    expect(await api.buy('sku_food')).toBe('failed');
  });
  expect(api.owned).toEqual([]);
});

test('restore replaces owned and reports whether anything was found', async () => {
  await mount(adapterWith({ restore: async () => ['food', 'retro'] }));
  await act(async () => {
    expect(await api.restore()).toBe(true);
  });
  expect(api.owned).toEqual(['food', 'retro']);

  await mount(adapterWith({ restore: async () => [] }));
  await act(async () => {
    expect(await api.restore()).toBe(false);
  });
});

test('bundle purchase sets hasPass and keeps pass out of owned', async () => {
  await mount(adapterWith({ purchase: async () => ({ outcome: 'success', ownedPackIds: ['retro', 'pass'] }) }));
  await act(async () => {
    expect(await api.buy('sku_allaccess')).toBe('success');
  });
  expect(api.hasPass).toBe(true);
  expect(api.owned).toEqual(['retro']); // pass is a capability, not a pack
});

test('reconcile without pass clears hasPass', async () => {
  await mount(adapterWith({ getOwnedPackIds: async () => ['retro'] }));
  expect(api.hasPass).toBe(false);
  expect(api.owned).toEqual(['retro']);
});
