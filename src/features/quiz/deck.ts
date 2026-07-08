/** Narrow a deck of brands to a single pack. Generic so it works on any row
 *  shape that carries a `pack_id`. */
export function filterDeckByPack<T extends { pack_id?: string | null }>(
  brands: T[],
  packId: string
): T[] {
  return brands.filter((b) => b.pack_id === packId);
}
