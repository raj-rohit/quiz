import { BUILDS, resolveAccent } from '../builds';

test('NL is the default amber accent', () => {
  expect(BUILDS.NL.accent.rgb).toBe('245 158 11');
  expect(BUILDS.NL.accent.deep).toBe('180 83 9');
  expect(BUILDS.NL.accent.glow).toBe('252 211 77');
});

test('resolveAccent falls back to NL for unknown codes', () => {
  expect(resolveAccent('XX' as any).code).toBe('NL');
});
