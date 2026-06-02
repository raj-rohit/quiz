import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { GhostButton } from '@/src/components/ui/GhostButton';
import { usePlayer } from '@/src/state/PlayerContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, radii } from '@/src/theme/tokens';

/** Skippable "what should we call you?" sheet — used on first run and from Profile. */
export function NamePrompt({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { name, setName } = usePlayer();
  const { colors, dark } = useTheme();
  const { t } = useTranslation();
  const [val, setVal] = useState(name ?? '');

  useEffect(() => {
    if (visible) setVal(name ?? '');
  }, [visible, name]);

  const save = () => {
    setName(val);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: dark ? '#1b1d1d' : '#ffffff', borderColor: colors.border }]} onPress={() => {}}>
          <Text style={[styles.title, { color: colors.text }]}>{t('profile.askName')}</Text>
          <TextInput
            value={val}
            onChangeText={setVal}
            placeholder={t('profile.namePlaceholder')}
            placeholderTextColor={dark ? 'rgba(255,255,255,0.3)' : 'rgba(26,28,28,0.3)'}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={save}
            maxLength={24}
            style={[styles.input, { color: colors.text, borderBottomColor: colors.primary }]}
          />
          <View style={{ height: 20 }} />
          <PrimaryButton label={t('profile.save')} iconRight={null} onPress={save} />
          <GhostButton label={t('profile.skip')} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 360, borderRadius: radii.cardLg, borderWidth: 1, padding: 24 },
  title: { fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.3, marginBottom: 16, textAlign: 'center' },
  input: { borderBottomWidth: 2, fontSize: 18, fontFamily: fonts.medium, paddingVertical: 10, textAlign: 'center' },
});
