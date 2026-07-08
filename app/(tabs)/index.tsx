import React, { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CategoryPicker } from '@/src/components/quiz/CategoryPicker';
import { PackRound } from '@/src/components/quiz/PackRound';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { isPackPlayable } from '@/src/features/catalog/selection';
import { Pack } from '@/src/features/catalog/types';

export default function ArenaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pack?: string }>();
  const { catalog } = useCatalog();
  const { owned } = useEntitlements();
  const [selected, setSelected] = useState<Pack | null>(null);

  // Deep link from Explore (?pack=<id>): open that pack's round when playable.
  useEffect(() => {
    if (!params.pack) return;
    const pack = catalog.packs.find((p) => p.id === params.pack);
    if (pack && isPackPlayable(pack, owned)) setSelected(pack);
    // Clear the param so leaving the round returns to the picker, not straight back in.
    router.setParams({ pack: '' });
  }, [params.pack, catalog.packs, owned]);

  if (selected) {
    return <PackRound pack={selected} onExit={() => setSelected(null)} />;
  }

  return (
    <CategoryPicker
      onStart={(pack) => setSelected(pack)}
      onLocked={() => router.navigate('/explore')}
    />
  );
}
