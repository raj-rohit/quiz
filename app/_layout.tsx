import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '@/src/i18n';
import { ThemeProvider } from '@/src/theme/ThemeProvider';
import { SettingsProvider } from '@/src/state/SettingsContext';
import { EntitlementsProvider } from '@/src/state/EntitlementsContext';
import { ProductsProvider } from '@/src/state/ProductsContext';
import { ProgressProvider } from '@/src/state/ProgressContext';
import { PlayerProvider } from '@/src/state/PlayerContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider>
      <SettingsProvider>
        <EntitlementsProvider>
          <ProductsProvider>
            <ProgressProvider>
              <PlayerProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="lab" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
                </Stack>
              </PlayerProvider>
            </ProgressProvider>
          </ProductsProvider>
        </EntitlementsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
