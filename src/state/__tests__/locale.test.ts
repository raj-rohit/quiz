import { resolveLocale } from '../locale';

test('auto resolves to nl when the device is Dutch', () => {
  expect(resolveLocale('auto', 'nl-NL')).toBe('nl');
});

test('auto resolves to en otherwise', () => {
  expect(resolveLocale('auto', 'de-DE')).toBe('en');
  expect(resolveLocale('auto', 'en-US')).toBe('en');
});

test('an explicit language choice always wins', () => {
  expect(resolveLocale('fr', 'nl-NL')).toBe('fr');
  expect(resolveLocale('de', 'en-US')).toBe('de');
});
