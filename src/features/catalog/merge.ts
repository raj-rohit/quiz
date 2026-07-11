import { OFFLINE_CATALOG } from './catalog';
import { Bundle, Catalog, Cover, Pack } from './types';
import type { IconName } from '@/src/components/ui/MaterialIcon';
import type { Market } from '@/src/state/nation';

export interface RemotePack {
  id: string;
  title?: Record<string, string>;
  blurb?: Record<string, string>;
  cover?: string;
  icon?: string;
  questions?: number;
  is_free?: boolean;
  free_question_count?: number;
  store_product_id?: string | null;
  sample?: boolean;
  sort_order?: number;
  visible?: boolean;
  markets?: string[] | null;
}

export interface RemoteConfig {
  bundle?: Record<string, any> | null;
  markets?: Market[] | null;
}

const COVERS: Cover[] = ['accent', 'cyan', 'ink', 'cream'];

function toPack(r: RemotePack): Pack {
  return {
    id: r.id,
    title: r.title ?? {},
    blurb: r.blurb ?? {},
    cover: (COVERS.includes(r.cover as Cover) ? (r.cover as Cover) : 'accent'),
    icon: (r.icon ?? 'star') as IconName,
    questions: r.questions ?? 0,
    isFree: !!r.is_free,
    freeQuestionCount: r.free_question_count ?? 0,
    storeProductId: r.store_product_id ?? undefined,
    sample: !!r.sample,
    sortOrder: r.sort_order ?? 0,
    visible: r.visible ?? true,
    markets: r.markets ?? null,
  };
}

function bundleFrom(config: RemoteConfig | null | undefined): Bundle {
  const b = config?.bundle;
  if (b && typeof b === 'object') {
    return {
      id: b.id ?? OFFLINE_CATALOG.bundle.id,
      title: b.title ?? OFFLINE_CATALOG.bundle.title,
      blurb: b.blurb ?? OFFLINE_CATALOG.bundle.blurb,
      icon: (b.icon ?? OFFLINE_CATALOG.bundle.icon) as IconName,
      storeProductId: b.store_product_id ?? b.storeProductId ?? OFFLINE_CATALOG.bundle.storeProductId,
    };
  }
  return OFFLINE_CATALOG.bundle;
}

/** Map Supabase rows → Catalog, filter invisible, sort by order. Empty/missing remote → offline fallback. */
export function mergeCatalog(
  remotePacks: RemotePack[] | null | undefined,
  remoteConfig: RemoteConfig | null | undefined
): Catalog {
  if (!remotePacks || remotePacks.length === 0) return OFFLINE_CATALOG;
  const packs = remotePacks
    .map(toPack)
    .filter((p) => p.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    packs,
    bundle: bundleFrom(remoteConfig),
    markets: remoteConfig?.markets?.length ? remoteConfig.markets : OFFLINE_CATALOG.markets,
  };
}
