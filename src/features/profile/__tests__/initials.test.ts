import { initials } from '../initials';

test('two+ words → first letter of first two', () => {
  expect(initials('Rohit Raj')).toBe('RR');
  expect(initials('  Jan  de Vries ')).toBe('JD');
});

test('single word → first two letters', () => {
  expect(initials('rohit')).toBe('RO');
  expect(initials('A')).toBe('A');
});

test('empty/nullish → empty string', () => {
  expect(initials('')).toBe('');
  expect(initials('   ')).toBe('');
  expect(initials(null)).toBe('');
  expect(initials(undefined)).toBe('');
});
