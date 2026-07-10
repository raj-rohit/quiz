import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { getReadyStoreAdapter } from '@/src/features/store';
import type { StoreAdapter, StoreProduct } from '@/src/features/store/adapter';
import { computeBundleSavings } from '@/src/features/store/savings';

interface ProductsValue {
  /** Localized price string for a sku, or '' while loading / offline / unknown. */
  getPrice: (sku?: string) => string;
  /** "Usually X · save Y%" data for the bundle card; null hides the pill. */
  bundleSavings: { regular: string; savePct: number } | null;
}

const Ctx = createContext<ProductsValue | null>(null);

export function ProductsProvider({
  children,
  adapter,
}: {
  children: React.ReactNode;
  adapter?: StoreAdapter; // test seam; defaults to the app-wide adapter
}) {
  const { catalog } = useCatalog();
  const [products, setProducts] = useState<StoreProduct[]>([]);

  const packSkus = useMemo(
    () =>
      catalog.packs
        .filter((p) => !p.isFree && p.storeProductId)
        .map((p) => p.storeProductId as string),
    [catalog]
  );
  const bundleSku = catalog.bundle.storeProductId;
  const skusKey = [...packSkus, bundleSku ?? ''].join(',');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const a = adapter ?? (await getReadyStoreAdapter());
        const skus = bundleSku ? [...packSkus, bundleSku] : packSkus;
        if (skus.length === 0) return;
        const fetched = await a.getProducts(skus);
        if (active) setProducts(fetched);
      } catch {
        // Offline / store unavailable: prices stay '', buying stays disabled.
      }
    })();
    return () => {
      active = false;
    };
    // skusKey covers packSkus + bundleSku (catalog refreshes from Supabase).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, skusKey]);

  const value = useMemo<ProductsValue>(
    () => ({
      getPrice: (sku?: string) => (sku ? products.find((p) => p.sku === sku)?.priceString ?? '' : ''),
      bundleSavings: computeBundleSavings(products, packSkus, bundleSku),
    }),
    [products, packSkus, bundleSku]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProducts = (): ProductsValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProducts must be used within ProductsProvider');
  return v;
};
