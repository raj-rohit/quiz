import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { getReadyStoreAdapter } from '@/src/features/store';
import type { PurchaseOutcome, StoreAdapter } from '@/src/features/store/adapter';
import { PASS_ID } from './entitlements';

export { computeOwnedAfterBuy } from './entitlements';

interface EntitlementsValue {
  /** Owned pack ids — never contains PASS_ID. */
  owned: string[];
  /** All-access pass: unlocks roaming (nations) and every future pack. */
  hasPass: boolean;
  /** True once the initial cached-owned load has resolved (before the store reconcile). */
  ready: boolean;
  /** Purchase by store sku (pack.storeProductId / bundle.storeProductId). */
  buy: (sku: string | undefined) => Promise<PurchaseOutcome>;
  /** True if restore found anything to restore. */
  restore: () => Promise<boolean>;
}

const Ctx = createContext<EntitlementsValue | null>(null);

export function EntitlementsProvider({
  children,
  adapter,
}: {
  children: React.ReactNode;
  adapter?: StoreAdapter; // test seam; defaults to the app-wide adapter
}) {
  const [rawOwned, setRawOwned] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const owned = rawOwned.filter((id) => id !== PASS_ID);
  const hasPass = rawOwned.includes(PASS_ID);

  const resolveAdapter = () => (adapter ? Promise.resolve(adapter) : getReadyStoreAdapter());

  useEffect(() => {
    let active = true;
    // Offline-first: cached entitlements render immediately…
    loadJSON<string[]>(KEYS.owned, []).then((cached) => {
      if (!active) return;
      setRawOwned(cached);
      // Mark ready before the reconcile below runs — consumers (e.g. NationContext's
      // snap-back) can now trust `hasPass` isn't a false-negative from an empty initial state.
      setReady(true);
    });
    // …then the store reconciles them (refunds, other-device purchases).
    (async () => {
      try {
        const fresh = await (await resolveAdapter()).getOwnedPackIds();
        if (!active) return;
        setRawOwned(fresh);
        saveJSON(KEYS.owned, fresh);
      } catch {
        // Store unreachable: keep the cached list.
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  const buy: EntitlementsValue['buy'] = async (sku) => {
    if (!sku) return 'failed';
    try {
      const result = await (await resolveAdapter()).purchase(sku);
      if (result.outcome === 'success') {
        setRawOwned(result.ownedPackIds);
        saveJSON(KEYS.owned, result.ownedPackIds);
      }
      return result.outcome;
    } catch {
      return 'failed'; // adapters shouldn't reject, but a stuck payment sheet is never acceptable
    }
  };

  const restore: EntitlementsValue['restore'] = async () => {
    try {
      const fresh = await (await resolveAdapter()).restore();
      setRawOwned(fresh);
      saveJSON(KEYS.owned, fresh);
      return fresh.length > 0;
    } catch {
      return false; // surfaced as "nothing to restore"; retry when online
    }
  };

  return <Ctx.Provider value={{ owned, hasPass, ready, buy, restore }}>{children}</Ctx.Provider>;
}

export const useEntitlements = (): EntitlementsValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return v;
};

/** Non-throwing variant for providers that accept a test-only override and may mount without EntitlementsProvider. */
export const useEntitlementsOptional = (): EntitlementsValue | null => useContext(Ctx);
