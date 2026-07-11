import type { Locale } from '@/src/state/locale';
import type { IconName } from '@/src/components/ui/MaterialIcon';
import type { Market } from '@/src/state/nation';

export type Cover = 'accent' | 'cyan' | 'ink' | 'cream';
export type Localized = Partial<Record<Locale, string>>;

export interface Pack {
  id: string;
  title: Localized;
  blurb: Localized;
  cover: Cover;
  icon: IconName;
  questions: number;
  isFree: boolean;
  freeQuestionCount: number;
  /** SKU to surface; the localized price string comes from the store, never here. */
  storeProductId?: string;
  sample: boolean;
  sortOrder: number;
  visible: boolean;
  /** Markets this pack exists in; null/absent = all markets. */
  markets?: string[] | null;
}

export interface Bundle {
  id: string;
  title: Localized;
  blurb: Localized;
  icon: IconName;
  storeProductId?: string;
}

export interface Catalog {
  packs: Pack[];
  bundle: Bundle;
  /** Live markets from app_config; single-entry list keeps all nation UI dormant. */
  markets: Market[];
}
