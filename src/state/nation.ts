// Pure nation/market logic — no RN imports.

export const DEFAULT_NATION = 'nl';

export interface Market {
  code: string;
  name: string;
}

/** A stored nation code is only valid while its market is live in app_config. */
export function sanitizeNation(code: string | null | undefined, markets: Market[]): string {
  return code && markets.some((m) => m.code === code) ? code : DEFAULT_NATION;
}

/** Pack visibility per market: null/empty = every market. */
export function packInMarket(markets: string[] | null | undefined, nation: string): boolean {
  return !markets || markets.length === 0 || markets.includes(nation);
}

/** Nation-scoped storage key: deck caches and progress are per (nation, pack). */
export function scopedKey(nation: string, packId: string): string {
  return `${nation}:${packId}`;
}

/** One-time migration: pre-nations byPack keys were bare pack ids ⇒ they were NL. */
export function migrateByPack(byPack: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(byPack)) {
    out[key.includes(':') ? key : scopedKey(DEFAULT_NATION, key)] = value;
  }
  return out;
}
