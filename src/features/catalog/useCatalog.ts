import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { mergeCatalog } from './merge';
import { OFFLINE_CATALOG } from './catalog';
import { Catalog } from './types';

/**
 * Reads the pack catalog from Supabase, falling back to the baked-in offline
 * catalog on error/empty (e.g. before the packs migration is pushed).
 */
export function useCatalog(): { catalog: Catalog; loading: boolean } {
  const [catalog, setCatalog] = useState<Catalog>(OFFLINE_CATALOG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [packsRes, configRes] = await Promise.all([
          supabase.from('packs').select('*'),
          supabase.from('app_config').select('*').limit(1).maybeSingle(),
        ]);
        if (active) setCatalog(mergeCatalog(packsRes.data as any, configRes.data as any));
      } catch {
        if (active) setCatalog(OFFLINE_CATALOG);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { catalog, loading };
}
