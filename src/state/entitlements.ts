// Pure entitlement logic — no RN imports.

/**
 * Capability entitlement granted only by sku_allaccess. Never a pack id —
 * consumers must not surface it in owned-pack lists (see EntitlementsContext).
 */
export const PASS_ID = 'pass';

/**
 * Owned pack ids after a (mocked) purchase. Buying the bundle grants every
 * paid pack at once; buying a single pack adds it once (idempotent).
 */
export function computeOwnedAfterBuy(
  owned: string[],
  packId: string,
  paidIds: string[],
  isBundle: boolean
): string[] {
  if (isBundle) return Array.from(new Set([...owned, ...paidIds]));
  return owned.includes(packId) ? owned : [...owned, packId];
}
