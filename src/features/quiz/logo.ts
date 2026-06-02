import { supabase } from '@/src/lib/supabase';

/**
 * Resolve a brand's `image_url` to a loadable URL.
 * - Full http(s) URLs (today's unavatar.io values) pass through unchanged.
 * - A Supabase Storage object path (e.g. `logos/foo.png` or `foo.png`) is
 *   turned into its public CDN URL — so moving logos into the `logos` bucket
 *   is just a data change, no app update.
 */
export function logoUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.replace(/^\/+/, '').replace(/^logos\//, '');
  return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
}
