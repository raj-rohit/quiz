import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MeshBackground } from '@/src/components/ui/MeshBackground';
import { contentTopPadding } from './topBarLayout';
import { BOTTOM_NAV_CLEARANCE } from './BottomNav';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  center?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Shared screen scaffold: mesh backdrop + safe padding clear of the top bar / bottom nav. */
export function Screen({ children, scroll = false, center = false, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = contentTopPadding(insets.top);
  const paddingBottom = insets.bottom + BOTTOM_NAV_CLEARANCE;
  const inner = [{ paddingTop, paddingBottom, paddingHorizontal: 16 }, center && styles.center, contentStyle];

  return (
    <View style={styles.fill}>
      <MeshBackground />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ paddingTop, paddingBottom, paddingHorizontal: 16 }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          alwaysBounceVertical={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, inner]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
