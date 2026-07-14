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

import { chooseAdapterKind } from '../index';

test('iOS dev/production build with an API key uses RevenueCat', () => {
  expect(chooseAdapterKind({ platform: 'ios', appOwnership: null, apiKey: 'appl_x' })).toBe('revenuecat');
});

test('Expo Go uses the mock even with a key', () => {
  expect(chooseAdapterKind({ platform: 'ios', appOwnership: 'expo', apiKey: 'appl_x' })).toBe('mock');
});

test('missing or empty API key uses the mock', () => {
  expect(chooseAdapterKind({ platform: 'ios', appOwnership: null, apiKey: '' })).toBe('mock');
  expect(chooseAdapterKind({ platform: 'ios', appOwnership: null, apiKey: undefined })).toBe('mock');
});

test('Android dev/production build with an API key uses RevenueCat', () => {
  expect(chooseAdapterKind({ platform: 'android', appOwnership: null, apiKey: 'test_x' })).toBe('revenuecat');
});

test('Android without a key uses the mock', () => {
  expect(chooseAdapterKind({ platform: 'android', appOwnership: null, apiKey: '' })).toBe('mock');
  expect(chooseAdapterKind({ platform: 'android', appOwnership: null, apiKey: undefined })).toBe('mock');
});

test('web uses the mock even with a key', () => {
  expect(chooseAdapterKind({ platform: 'web', appOwnership: null, apiKey: 'appl_x' })).toBe('mock');
});
