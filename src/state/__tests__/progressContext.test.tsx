import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('@/src/lib/storage', () => {
  const mem = new Map<string, unknown>();
  return {
    loadJSON: jest.fn(async (key: string, fallback: unknown) => (mem.has(key) ? mem.get(key) : fallback)),
    saveJSON: jest.fn(async (key: string, value: unknown) => {
      mem.set(key, value);
    }),
    KEYS: { progress: 'll.progress' },
    __mem: mem,
  };
});

import { ProgressProvider, useProgress } from '../ProgressContext';
import { emptyProgress } from '../progress';
import { scopedKey } from '../nation';

let api!: ReturnType<typeof useProgress>;
function Probe() {
  api = useProgress();
  return null;
}

const mount = async () => {
  await act(async () => {
    create(
      <ProgressProvider>
        <Probe />
      </ProgressProvider>
    );
  });
};

beforeEach(() => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.clear();
});

test('pre-nations byPack keys are migrated to nl-scoped keys on load', async () => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.set('ll.progress', { ...emptyProgress(), byPack: { retro: 5 } });
  await mount();
  expect(api.progress.byPack).toEqual({ 'nl:retro': 5 });
});

test('record accumulates under an already-scoped pack key', async () => {
  await mount();
  await act(async () => {
    api.record({ packId: scopedKey('nl', 'food'), correct: true, timeSec: 3 });
  });
  expect(api.progress.byPack).toEqual({ 'nl:food': 1 });
});
