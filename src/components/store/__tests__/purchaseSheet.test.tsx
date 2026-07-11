import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Bundle } from '@/src/features/catalog/types';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: { View }, SlideInDown: { duration: () => ({}) } };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('@/src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    dark: true,
    accent: { rgb: '255,153,51', deep: '204,102,0' },
    colors: {
      primary: '#f93', primaryDeep: '#c60', secondary: '#4af',
      text: '#fff', textMuted: '#aaa', textFaint: '#888',
    },
  }),
}));
jest.mock('@/src/state/SettingsContext', () => ({ useSettings: () => ({ locale: 'en' }) }));
// @expo/vector-icons loads fonts async, which trips act() warnings after teardown.
// The stub records rendered icon names so tests can assert on them.
const mockIconNames: string[] = [];
jest.mock('@/src/components/ui/MaterialIcon', () => ({
  MaterialIcon: ({ name }: { name: string }) => {
    mockIconNames.push(name);
    return null;
  },
}));

// Price comes from ProductsContext now; overridable per test.
let mockPrice = '€7,99';
jest.mock('@/src/state/ProductsContext', () => ({
  useProducts: () => ({ getPrice: () => mockPrice, bundleSavings: null }),
}));

import { PurchaseSheet, PurchaseTarget } from '../PurchaseSheet';

const bundle: Bundle = {
  id: 'allaccess',
  title: { en: 'Unlock Everything' },
  blurb: { en: 'All paid packs.' },
  icon: 'workspace_premium',
  storeProductId: 'sku_allaccess',
};

const target = { kind: 'bundle', bundle } as const;

// Pressable is memo(forwardRef(...)), so we match on props rather than type.
const findRestore = (tree: ReactTestRenderer) =>
  tree.root.findAll((n) => n.props.testID === 'restore-purchases' && typeof n.props.onPress === 'function');

const findByTestID = (tree: ReactTestRenderer, testID: string) =>
  tree.root.findAll((n) => n.props.testID === testID && typeof n.props.onPress === 'function');

const texts = (tree: ReactTestRenderer): string[] =>
  tree.root.findAll((n) => (n.type as any) === 'Text' || (n.type as any)?.displayName === 'Text').flatMap((n) => {
    const c = n.props.children;
    return Array.isArray(c) ? c.filter((x) => typeof x === 'string') : typeof c === 'string' ? [c] : [];
  });

const mount = (onConfirm: (t: PurchaseTarget) => Promise<'success' | 'cancelled' | 'failed'>, onRestore = () => {}) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <PurchaseSheet target={target} onConfirm={onConfirm} onClose={() => {}} onStart={() => {}} onRestore={onRestore} />
    );
  });
  return tree;
};

beforeEach(() => {
  mockPrice = '€7,99';
  mockIconNames.length = 0;
});

test('pressing restore calls onRestore', () => {
  const onRestore = jest.fn();
  const tree = mount(async () => 'success', onRestore);
  const [restore] = findRestore(tree);
  expect(restore).toBeDefined();
  act(() => restore.props.onPress());
  expect(onRestore).toHaveBeenCalledTimes(1);
});

test('restore is inert while payment is processing', async () => {
  const onRestore = jest.fn();
  let resolveBuy!: (o: 'success') => void;
  const pending = new Promise<'success'>((r) => (resolveBuy = r));
  const tree = mount(() => pending, onRestore);

  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => {
    confirm.props.onPress();
  });

  expect(findRestore(tree)).toHaveLength(0);
  expect(onRestore).not.toHaveBeenCalled();
  await act(async () => resolveBuy('success'));
});

test('successful purchase reaches the done phase', async () => {
  const tree = mount(async () => 'success');
  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => confirm.props.onPress());
  expect(texts(tree)).toContain('sheet.done');
});

test('cancelled purchase returns to confirm without an error', async () => {
  const tree = mount(async () => 'cancelled');
  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => confirm.props.onPress());
  expect(findByTestID(tree, 'confirm-purchase')).toHaveLength(1);
  expect(texts(tree)).not.toContain('sheet.failed');
});

test('failed purchase returns to confirm and shows the error', async () => {
  const tree = mount(async () => 'failed');
  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => confirm.props.onPress());
  expect(findByTestID(tree, 'confirm-purchase')).toHaveLength(1);
  expect(texts(tree)).toContain('sheet.failed');
  expect(mockIconNames).toContain('error');
});

test('without a price the confirm button is disabled and a hint shows', async () => {
  mockPrice = '';
  const onConfirm = jest.fn(async () => 'success' as const);
  const tree = mount(onConfirm);
  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => {
    confirm.props.onPress();
  });
  expect(onConfirm).not.toHaveBeenCalled();
  expect(texts(tree)).toContain('sheet.noPrice');
  expect(mockIconNames).toContain('wifi_off');
});
