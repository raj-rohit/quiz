import { mergeCatalog, RemotePack } from '../merge';
import { OFFLINE_CATALOG } from '../catalog';

test('empty/missing remote falls back to the offline catalog', () => {
  expect(mergeCatalog([], null).packs.length).toBe(OFFLINE_CATALOG.packs.length);
  expect(mergeCatalog(null, null).packs.length).toBe(OFFLINE_CATALOG.packs.length);
});

test('remote packs are mapped and sorted by sort_order', () => {
  const remote: RemotePack[] = [
    { id: 'z', title: { en: 'Z' }, blurb: { en: '' }, cover: 'cyan', icon: 'star', is_free: false, sort_order: 2, visible: true },
    { id: 'a', title: { en: 'A' }, blurb: { en: '' }, cover: 'ink', icon: 'star', is_free: true, sort_order: 1, visible: true },
  ];
  expect(mergeCatalog(remote, null).packs.map((p) => p.id)).toEqual(['a', 'z']);
});

test('invisible packs are filtered out', () => {
  const remote: RemotePack[] = [
    { id: 'a', title: { en: 'A' }, blurb: { en: '' }, cover: 'ink', icon: 'star', is_free: true, sort_order: 1, visible: false },
  ];
  expect(mergeCatalog(remote, null).packs.length).toBe(0);
});

test('bundle comes from remote config when present', () => {
  const cat = mergeCatalog([{ id: 'a', title: { en: 'A' }, blurb: {}, sort_order: 1, visible: true }], {
    bundle: { id: 'b2', title: { en: 'Mega' }, blurb: {}, icon: 'workspace_premium', store_product_id: 'sku_x' },
  });
  expect(cat.bundle.id).toBe('b2');
  expect(cat.bundle.storeProductId).toBe('sku_x');
});

const row = (id: string, extra: object = {}) => ({ id, title: { en: id }, ...extra });

test('mergeCatalog carries pack markets through (null = all)', () => {
  const cat = mergeCatalog([row('a'), row('b', { markets: ['be'] })], null);
  expect(cat.packs.find((p) => p.id === 'a')!.markets).toBeNull();
  expect(cat.packs.find((p) => p.id === 'b')!.markets).toEqual(['be']);
});

test('mergeCatalog reads app_config markets with NL fallback', () => {
  expect(mergeCatalog([row('a')], null).markets).toEqual([{ code: 'nl', name: 'Nederland' }]);
  expect(
    mergeCatalog([row('a')], { markets: [{ code: 'nl', name: 'Nederland' }, { code: 'be', name: 'België' }] }).markets
  ).toEqual([{ code: 'nl', name: 'Nederland' }, { code: 'be', name: 'België' }]);
});
