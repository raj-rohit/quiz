import { DEFAULT_NATION, sanitizeNation, packInMarket, scopedKey, migrateByPack } from '../nation';

const MARKETS = [
  { code: 'nl', name: 'Nederland' },
  { code: 'be', name: 'België' },
];

test('sanitizeNation returns the code when it is a live market', () => {
  expect(sanitizeNation('be', MARKETS)).toBe('be');
});

test('sanitizeNation falls back to nl for unknown, removed, or missing codes', () => {
  expect(sanitizeNation('fr', MARKETS)).toBe(DEFAULT_NATION);
  expect(sanitizeNation(null, MARKETS)).toBe(DEFAULT_NATION);
  expect(sanitizeNation(undefined, [])).toBe(DEFAULT_NATION);
});

test('packInMarket: null/empty markets means all markets', () => {
  expect(packInMarket(null, 'be')).toBe(true);
  expect(packInMarket(undefined, 'nl')).toBe(true);
  expect(packInMarket([], 'be')).toBe(true);
});

test('packInMarket: scoped packs match only their listed markets', () => {
  expect(packInMarket(['be'], 'be')).toBe(true);
  expect(packInMarket(['be'], 'nl')).toBe(false);
});

test('scopedKey formats nation:packId', () => {
  expect(scopedKey('nl', 'retro')).toBe('nl:retro');
});

test('migrateByPack prefixes un-scoped keys with nl and is idempotent', () => {
  const once = migrateByPack({ retro: 5, 'be:food': 2 });
  expect(once).toEqual({ 'nl:retro': 5, 'be:food': 2 });
  expect(migrateByPack(once)).toEqual(once);
});
