import type { Locale } from '@/src/state/locale';
import type { IconName } from '@/src/components/ui/MaterialIcon';

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
}
