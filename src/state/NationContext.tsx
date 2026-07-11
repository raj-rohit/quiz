import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { useEntitlementsOptional } from './EntitlementsContext';
import { DEFAULT_NATION, Market, sanitizeNation } from './nation';

interface NationValue {
  homeNation: string;
  /** The market currently played; differs from home only while a pass holder roams. */
  activeNation: string;
  setHomeNation: (code: string) => void;
  /** Pass-gated: silently ignored without the pass. */
  roamTo: (code: string) => void;
}

const Ctx = createContext<NationValue | null>(null);

const NL_ONLY: Market[] = [{ code: 'nl', name: 'Nederland' }];

export function NationProvider({
  children,
  hasPassOverride,
  markets = NL_ONLY,
}: {
  children: React.ReactNode;
  /** Test seam; production reads EntitlementsContext. */
  hasPassOverride?: boolean;
  /** Live market list; UI plumbs the catalog's list in plan 2b. */
  markets?: Market[];
}) {
  // Optional: NationProvider may mount above or without EntitlementsProvider
  // (tests use hasPassOverride instead of wiring up the real store adapter).
  const entitlements = useEntitlementsOptional();
  const hasPass = hasPassOverride ?? entitlements?.hasPass ?? false;
  const [homeNation, setHome] = useState(DEFAULT_NATION);
  const [activeNation, setActive] = useState(DEFAULT_NATION);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const home = sanitizeNation(await loadJSON<string | null>(KEYS.homeNation, null), markets);
      const active = sanitizeNation(await loadJSON<string | null>(KEYS.activeNation, null), markets);
      if (!mounted) return;
      setHome(home);
      setActive(active);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Roaming never survives pass loss (refunds, other-device revocations).
  useEffect(() => {
    if (!hasPass && activeNation !== homeNation) {
      setActive(homeNation);
      saveJSON(KEYS.activeNation, homeNation);
    }
  }, [hasPass, activeNation, homeNation]);

  const setHomeNation = (code: string) => {
    const next = sanitizeNation(code, markets);
    setHome(next);
    saveJSON(KEYS.homeNation, next);
    if (!hasPass || activeNation === homeNation) {
      setActive(next);
      saveJSON(KEYS.activeNation, next);
    }
  };

  const roamTo = (code: string) => {
    if (!hasPass) return;
    const next = sanitizeNation(code, markets);
    setActive(next);
    saveJSON(KEYS.activeNation, next);
  };

  return <Ctx.Provider value={{ homeNation, activeNation, setHomeNation, roamTo }}>{children}</Ctx.Provider>;
}

export const useNation = (): NationValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNation must be used within NationProvider');
  return v;
};
