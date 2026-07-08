import { Pack } from './types';

/** A pack is playable when it is free or the player owns it. */
export function isPackPlayable(pack: Pack, owned: string[]): boolean {
  return pack.isFree || owned.includes(pack.id);
}

/**
 * Resolve which pack to pre-select on the category screen.
 * Prefers the remembered id (when still a known pack), else the first free
 * pack, else the first pack, else null (no packs at all).
 */
export function resolveLastPack(lastId: string | null, packs: Pack[]): string | null {
  if (lastId && packs.some((p) => p.id === lastId)) return lastId;
  const firstFree = packs.find((p) => p.isFree);
  return firstFree?.id ?? packs[0]?.id ?? null;
}
