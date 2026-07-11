import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('@/src/lib/storage', () => {
  const mem = new Map<string, unknown>();
  return {
    loadJSON: jest.fn(async (key: string, fallback: unknown) => (mem.has(key) ? mem.get(key) : fallback)),
    saveJSON: jest.fn(async (key: string, value: unknown) => {
      mem.set(key, value);
    }),
    KEYS: { homeNation: 'll.homeNation', activeNation: 'll.activeNation' },
    __mem: mem,
  };
});

import { NationProvider, useNation } from '../NationContext';
import type { Market } from '../nation';

const MARKETS: Market[] = [
  { code: 'nl', name: 'Nederland' },
  { code: 'be', name: 'België' },
];

let api!: ReturnType<typeof useNation>;
function Probe() {
  api = useNation();
  return null;
}

const mount = async (hasPassOverride: boolean, markets: Market[] = MARKETS) => {
  await act(async () => {
    create(
      <NationProvider hasPassOverride={hasPassOverride} markets={markets}>
        <Probe />
      </NationProvider>
    );
  });
};

beforeEach(() => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.clear();
});

test('defaults to nl home and active with empty storage', async () => {
  await mount(false);
  expect(api.homeNation).toBe('nl');
  expect(api.activeNation).toBe('nl');
});

test('setHomeNation persists and moves active with it when not roaming', async () => {
  await mount(false);
  await act(async () => {
    api.setHomeNation('be');
  });
  expect(api.homeNation).toBe('be');
  expect(api.activeNation).toBe('be');
  const { __mem } = jest.requireMock('@/src/lib/storage');
  expect(__mem.get('ll.homeNation')).toBe('be');
});

test('roamTo is ignored without the pass', async () => {
  await mount(false);
  await act(async () => {
    api.roamTo('be');
  });
  expect(api.activeNation).toBe('nl');
});

test('roamTo switches active for pass holders and persists', async () => {
  await mount(true);
  await act(async () => {
    api.roamTo('be');
  });
  expect(api.activeNation).toBe('be');
  expect(api.homeNation).toBe('nl');
  const { __mem } = jest.requireMock('@/src/lib/storage');
  expect(__mem.get('ll.activeNation')).toBe('be');
});

test('active snaps back to home when the pass disappears', async () => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.set('ll.homeNation', 'nl');
  __mem.set('ll.activeNation', 'be');
  await mount(false);
  expect(api.activeNation).toBe('nl');
  expect(__mem.get('ll.activeNation')).toBe('nl');
});

test('stored codes are sanitized against live markets', async () => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.set('ll.homeNation', 'fr');
  await mount(false, [{ code: 'nl', name: 'Nederland' }]);
  expect(api.homeNation).toBe('nl');
});
