import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { packInMarket } from '@/src/state/nation';
import { useNation } from '@/src/state/NationContext';
import { mergeCatalog } from './merge';
import { OFFLINE_CATALOG } from './catalog';
import { Catalog } from './types';

/**
 * Stale-while-revalidate catalog: renders instantly from the baked-in offline
 * catalog (then the last cached Supabase result), and refreshes from Supabase
 * in the background. A paused/cold Supabase project is therefore never visible —
 * the Store shows content immediately and self-updates when the fetch returns.
 */
export function useCatalog(): { catalog: Catalog } {
  const [catalog, setCatalog] = useState<Catalog>(OFFLINE_CATALOG);
  const { activeNation } = useNation();

  useEffect(() => {
    let active = true;

    // 1. Instant: last cached remote catalog (if any), over the offline default.
    loadJSON<Catalog | null>(KEYS.catalog, null).then((cached) => {
      if (active && cached?.packs?.length) setCatalog(cached);
    });

    // 2. Background refresh from Supabase; only replace on a non-empty result.
    (async () => {
      try {
        const [packsRes, configRes] = await Promise.all([
          supabase.from('packs').select('*'),
          supabase.from('app_config').select('*').limit(1).maybeSingle(),
        ]);
        if (!active) return;
        const rows = (packsRes.data as any[]) ?? [];
        if (rows.length) {
          const merged = mergeCatalog(rows, configRes.data as any);
          setCatalog(merged);
          saveJSON(KEYS.catalog, merged);
        }
      } catch {
        // keep cached / offline catalog
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return {
    catalog: {
      ...catalog,
      // Pre-upgrade caches (saved before `markets` existed on Catalog) can be
      // replayed via the loadJSON path above; normalize here so `markets` is
      // never undefined at runtime even if the Supabase refresh never lands.
      markets: catalog.markets ?? OFFLINE_CATALOG.markets,
      packs: catalog.packs.filter((p) => packInMarket(p.markets, activeNation)),
    },
  };
}
