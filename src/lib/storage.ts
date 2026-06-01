import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort; storage failures are non-fatal for UI prefs
  }
}

export const KEYS = {
  lang: 'll.lang',
  dark: 'll.dark',
  owned: 'll.owned',
  progress: 'll.progress',
} as const;
