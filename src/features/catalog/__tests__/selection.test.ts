import { isPackPlayable, resolveLastPack } from '../selection';
import { Pack } from '../types';

const pack = (id: string, isFree: boolean): Pack => ({
  id,
  title: { en: id },
  blurb: { en: '' },
  cover: 'accent',
  icon: 'star',
  questions: 5,
  isFree,
  freeQuestionCount: 3,
  sample: false,
  sortOrder: 0,
  visible: true,
});

const packs = [pack('classics', true), pack('food', false), pack('sport', false)];

describe('isPackPlayable', () => {
  test('free packs are always playable', () => {
    expect(isPackPlayable(pack('classics', true), [])).toBe(true);
  });
  test('paid packs are playable only when owned', () => {
    expect(isPackPlayable(pack('food', false), [])).toBe(false);
    expect(isPackPlayable(pack('food', false), ['food'])).toBe(true);
  });
});

describe('resolveLastPack', () => {
  test('returns the remembered id when it is a visible pack', () => {
    expect(resolveLastPack('food', packs)).toBe('food');
  });
  test('falls back to the first free pack when id is null', () => {
    expect(resolveLastPack(null, packs)).toBe('classics');
  });
  test('falls back to the first free pack when id is unknown', () => {
    expect(resolveLastPack('ghost', packs)).toBe('classics');
  });
  test('falls back to the first pack when none are free', () => {
    expect(resolveLastPack(null, [pack('food', false), pack('sport', false)])).toBe('food');
  });
  test('returns null when there are no packs', () => {
    expect(resolveLastPack('food', [])).toBeNull();
  });
});
