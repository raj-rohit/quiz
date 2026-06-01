import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, rgb } from '@/src/theme/tokens';
import { MaterialIcon, IconName } from '@/src/components/ui/MaterialIcon';

interface NavRoute { key: string; name: string }
export interface BottomNavProps {
  state: { index: number; routes: NavRoute[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

const ORDER: { name: string; labelKey: string; icon: IconName }[] = [
  { name: 'explore', labelKey: 'nav.explore', icon: 'explore' },
  { name: 'index', labelKey: 'nav.arena', icon: 'sports_esports' },
  { name: 'profile', labelKey: 'nav.profile', icon: 'person' },
];

/** Custom raised glass tab bar (SPEC §7). Absolute → floats over the scene. */
export function BottomNav({ state, navigation }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const { colors, dark, accent } = useTheme();
  const { t } = useTranslation();
  const focusedName = state.routes[state.index]?.name;

  const press = (route: NavRoute | undefined, name: string) => {
    if (!route) return;
    const isFocused = route.name === focusedName;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(name);
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: insets.bottom + 10, borderTopColor: rgb(accent.rgb, dark ? 0.2 : 0.1) },
      ]}
    >
      <BlurView intensity={dark ? 40 : 30} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)' }]} />
      <View style={styles.row}>
        {ORDER.map((item) => {
          const route = state.routes.find((r) => r.name === item.name);
          const active = item.name === focusedName;
          if (active) {
            return (
              <Pressable
                key={item.name}
                onPress={() => press(route, item.name)}
                style={[styles.activePill, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              >
                <MaterialIcon name={item.icon} size={22} color="#ffffff" />
                <Text style={styles.activeLabel}>{t(item.labelKey)}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable key={item.name} onPress={() => press(route, item.name)} style={styles.item}>
              <MaterialIcon name={item.icon} size={22} color={colors.textFaint} />
              <Text style={[styles.label, { color: colors.textFaint }]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 12 },
  item: { alignItems: 'center', justifyContent: 'center', padding: 8, gap: 2 },
  activePill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: -6,
    borderRadius: 9999,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  activeLabel: { color: '#ffffff', fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  label: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
});
