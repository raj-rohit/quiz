import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { getReadyStoreAdapter } from '@/src/features/store';
import type { PurchaseOutcome, StoreAdapter } from '@/src/features/store/adapter';

export { computeOwnedAfterBuy } from './entitlements';

interface EntitlementsValue {
  owned: string[];
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
  const [owned, setOwned] = useState<string[]>([]);

  const resolveAdapter = () => (adapter ? Promise.resolve(adapter) : getReadyStoreAdapter());

  useEffect(() => {
    let active = true;
    // Offline-first: cached entitlements render immediately…
    loadJSON<string[]>(KEYS.owned, []).then((cached) => {
      if (active) setOwned(cached);
    });
    // …then the store reconciles them (refunds, other-device purchases).
    (async () => {
      try {
        const fresh = await (await resolveAdapter()).getOwnedPackIds();
        if (!active) return;
        setOwned(fresh);
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
        setOwned(result.ownedPackIds);
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
      setOwned(fresh);
      saveJSON(KEYS.owned, fresh);
      return fresh.length > 0;
    } catch {
      return false; // surfaced as "nothing to restore"; retry when online
    }
  };

  return <Ctx.Provider value={{ owned, buy, restore }}>{children}</Ctx.Provider>;
}

export const useEntitlements = (): EntitlementsValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return v;
};
