import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('@/src/lib/storage', () => {
  const mem = new Map<string, unknown>();
  return {
    loadJSON: jest.fn(async (key: string, fallback: unknown) => (mem.has(key) ? mem.get(key) : fallback)),
    saveJSON: jest.fn(async () => {}),
    KEYS: { catalog: 'll.catalog.cache' },
    __mem: mem,
  };
});

// Supabase must never resolve here: the guarantee under test is the cache-load
// path alone (step 1 in useCatalog), which must normalize `markets` even when
// the background refresh (step 2) never lands (offline / paused project).
jest.mock('@/src/lib/supabase', () => {
  const foreverPending = (): any => {
    const p: any = new Promise(() => {});
    p.limit = () => foreverPending();
    p.maybeSingle = () => foreverPending();
    return p;
  };
  return {
    supabase: {
      from: () => ({ select: () => foreverPending() }),
    },
  };
});

// Isolate from real NationContext plumbing; useCatalog only reads activeNation.
jest.mock('@/src/state/NationContext', () => ({
  useNation: () => ({ activeNation: 'nl', homeNation: 'nl', setHomeNation: jest.fn(), roamTo: jest.fn() }),
}));

import { useCatalog } from '../useCatalog';
import { OFFLINE_CATALOG } from '../catalog';

let api!: ReturnType<typeof useCatalog>;
function Probe() {
  api = useCatalog();
  return null;
}

const mount = async () => {
  await act(async () => {
    create(<Probe />);
  });
};

beforeEach(() => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.clear();
});

test('a cached catalog missing `markets` (pre-upgrade shape) still yields the NL default through the hook', async () => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  const { markets, ...preUpgradeCached } = OFFLINE_CATALOG; // simulate a cache saved before `markets` existed
  __mem.set('ll.catalog.cache', preUpgradeCached);

  await mount();

  expect(api.catalog.markets).toEqual(OFFLINE_CATALOG.markets);
});
