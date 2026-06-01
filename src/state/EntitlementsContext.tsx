import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { computeOwnedAfterBuy } from './entitlements';

export { computeOwnedAfterBuy } from './entitlements';

interface EntitlementsValue {
  owned: string[];
  buy: (packId: string, paidIds: string[], isBundle: boolean) => void;
  restore: () => boolean;
}

const Ctx = createContext<EntitlementsValue | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<string[]>([]);

  useEffect(() => {
    loadJSON<string[]>(KEYS.owned, []).then(setOwned);
  }, []);

  const buy: EntitlementsValue['buy'] = (packId, paidIds, isBundle) => {
    setOwned((prev) => {
      const next = computeOwnedAfterBuy(prev, packId, paidIds, isBundle);
      saveJSON(KEYS.owned, next);
      return next;
    });
  };

  // Real app queries the store / RevenueCat for this account's purchases.
  // Here we re-confirm any already-cached entitlements.
  const restore = () => owned.length > 0;

  return <Ctx.Provider value={{ owned, buy, restore }}>{children}</Ctx.Provider>;
}

export const useEntitlements = (): EntitlementsValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return v;
};
