import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { StoreAdapter } from './adapter';
import { MockStoreAdapter } from './mock';

export type { StoreAdapter, StoreProduct, PurchaseOutcome, PurchaseResult } from './adapter';

export type AdapterKind = 'revenuecat' | 'mock';

/**
 * A platform joins RevenueCat by getting its own key in app.json extra;
 * today both hold the platform-agnostic Test Store key. When real stores
 * exist, iOS swaps to the appl_ key and Android to the goog_ key.
 */
export function chooseAdapterKind(input: {
  platform: string;
  appOwnership: string | null;
  apiKey: string | undefined;
}): AdapterKind {
  if (input.platform !== 'ios' && input.platform !== 'android') return 'mock';
  if (input.appOwnership === 'expo') return 'mock'; // Expo Go has no native billing module
  if (!input.apiKey) return 'mock';
  return 'revenuecat';
}

let ready: Promise<StoreAdapter> | null = null;

export function getReadyStoreAdapter(): Promise<StoreAdapter> {
  if (!ready) {
    ready = (async () => {
      const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
      const apiKey = (Platform.OS === 'android'
        ? extra?.revenuecatAndroidApiKey
        : extra?.revenuecatIosApiKey) as string | undefined;
      const kind = chooseAdapterKind({
        platform: Platform.OS,
        appOwnership: Constants.appOwnership,
        apiKey,
      });
      if (kind === 'revenuecat') {
        try {
          // Lazy require: the module factory only executes on real builds.
          const { RevenueCatAdapter } = require('./revenuecat') as typeof import('./revenuecat');
          const rc = new RevenueCatAdapter(apiKey as string);
          await rc.init();
          return rc;
        } catch (e) {
          console.warn('[store] RevenueCat init failed, falling back to mock', e);
        }
      }
      const mock = new MockStoreAdapter();
      await mock.init();
      return mock;
    })();
  }
  return ready;
}
