import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSettings } from '@/src/state/SettingsContext';
import { UI_LANGS, LANG_NAMES } from '@/src/state/locale';
import { fonts } from '@/src/theme/tokens';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';

interface Anchor { x: number; y: number; w: number; h: number; }

export function LanguageSwitcher() {
  const { colors, dark } = useTheme();
  const { locale, setLang } = useSettings();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const ref = useRef<View>(null);

  const openMenu = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const pillBg = dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,28,28,0.06)';
  const menuBg = dark ? '#1b1d1d' : '#ffffff';

  return (
    <>
      <Pressable ref={ref} onPress={openMenu} style={[styles.pill, { backgroundColor: pillBg }]} hitSlop={4}>
        <MaterialIcon name="language" size={16} color={colors.text} />
        <Text style={[styles.code, { color: colors.text }]}>{locale.toUpperCase()}</Text>
        <MaterialIcon name={open ? 'expand_less' : 'expand_more'} size={15} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)}>
          {anchor && (
            <View
              style={[
                styles.menu,
                {
                  backgroundColor: menuBg,
                  borderColor: colors.border,
                  top: anchor.y + anchor.h + 8,
                  right: Math.max(8, width - (anchor.x + anchor.w)),
                },
              ]}
            >
              {UI_LANGS.map((code) => {
                const active = code === locale;
                return (
                  <Pressable
                    key={code}
                    onPress={() => {
                      setLang(code);
                      setOpen(false);
                    }}
                    style={styles.row}
                  >
                    <Text style={[styles.rowLabel, { color: active ? colors.primary : colors.textMuted }]}>
                      {LANG_NAMES[code]}
                    </Text>
                    {active ? (
                      <MaterialIcon name="check_circle" size={17} color={colors.primary} />
                    ) : (
                      <Text style={[styles.rowCode, { color: colors.textFaint }]}>{code.toUpperCase()}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  code: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.5 },
  menu: {
    position: 'absolute',
    minWidth: 168,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rowLabel: { fontFamily: fonts.bold, fontSize: 13 },
  rowCode: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
});
