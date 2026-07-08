import { filterDeckByPack } from '../deck';

const brands = [
  { id: 'a', pack_id: 'classics' },
  { id: 'b', pack_id: 'food' },
  { id: 'c', pack_id: 'classics' },
  { id: 'd', pack_id: null },
];

describe('filterDeckByPack', () => {
  test('keeps only brands whose pack_id matches', () => {
    expect(filterDeckByPack(brands, 'classics').map((b) => b.id)).toEqual(['a', 'c']);
  });
  test('returns an empty array when no brand matches', () => {
    expect(filterDeckByPack(brands, 'ghost')).toEqual([]);
  });
});
