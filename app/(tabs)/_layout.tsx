import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TopAppBar } from '@/src/components/app/TopAppBar';
import { BottomNav } from '@/src/components/app/BottomNav';
import { NamePrompt } from '@/src/components/app/NamePrompt';
import { Toast } from '@/src/components/ui/Toast';
import { usePlayer } from '@/src/state/PlayerContext';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabLayout() {
  const { name, hydrated } = usePlayer();
  const { t } = useTranslation();
  const [firstRun, setFirstRun] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (name) {
      // Greet returning players once per launch.
      setWelcome(t('profile.welcomeBack', { name }));
      const id = setTimeout(() => setWelcome(null), 2600);
      return () => clearTimeout(id);
    }
    // First-ever launch with no name: offer the (skippable) name prompt once.
    loadJSON<boolean>(KEYS.namePrompted, false).then((prompted) => {
      if (!prompted) {
        setFirstRun(true);
        saveJSON(KEYS.namePrompted, true);
      }
    });
  }, [hydrated]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <BottomNav {...(props as any)} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <TopAppBar />
      <NamePrompt visible={firstRun} onClose={() => setFirstRun(false)} />
      <Toast message={welcome} />
    </View>
  );
}
