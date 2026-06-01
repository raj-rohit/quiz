import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { TopAppBar } from '@/src/components/app/TopAppBar';
import { BottomNav } from '@/src/components/app/BottomNav';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabLayout() {
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
    </View>
  );
}
