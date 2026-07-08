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
jest.mock('@/src/components/ui/MaterialIcon', () => ({ MaterialIcon: () => null }));

import { PurchaseSheet } from '../PurchaseSheet';

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

test('pressing restore calls onRestore', () => {
  const onRestore = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <PurchaseSheet target={target} onConfirm={() => {}} onClose={() => {}} onStart={() => {}} onRestore={onRestore} />
    );
  });

  const [restore] = findRestore(tree);
  expect(restore).toBeDefined();
  act(() => restore.props.onPress());
  expect(onRestore).toHaveBeenCalledTimes(1);
});

test('restore is inert while payment is processing', () => {
  jest.useFakeTimers();
  const onRestore = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <PurchaseSheet target={target} onConfirm={() => {}} onClose={() => {}} onStart={() => {}} onRestore={onRestore} />
    );
  });

  const [confirm] = findByTestID(tree, 'confirm-purchase');
  act(() => confirm.props.onPress());

  expect(findRestore(tree)).toHaveLength(0);
  expect(onRestore).not.toHaveBeenCalled();
  jest.useRealTimers();
});
