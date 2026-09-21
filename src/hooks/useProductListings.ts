import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const OUTLETS = [
  'Etsy',
  'Amazon KDP',
  'Kindle',
  'Whop',
  'Udemy',
  'AppSumo',
  'Creative Market',
  'Creative Fabrica',
  'Design Bundles',
  'Canva Creators',
  'Adobe Stock',
  'Amazon Merch',
  'TikTok Shop',
  'Amazon Marketplace',
  'Faire',
  'Walmart',
  'eBay',
  'Own store',
  'Gumroad',
  'Payhip',
  'Other',
] as const;

export const LISTING_STATUSES = ['planned', 'listed', 'paused', 'removed'] as const;

export interface ProductListing {
  id: string;
  product_id: string;
  outlet: string;
  status: string;
  url: string | null;
  price: number | null;
  listed_at: string | null;
  notes: string | null;
}

const ALL_KEY = ['product-listings', 'all'];
const oneKey = (productId: string) => ['product-listings', productId];

/** Listings for one product. */
export function useProductListings(productId: string | null | undefined) {
  return useQuery({
    queryKey: productId ? oneKey(productId) : ['product-listings', 'none'],
    enabled: !!productId,
    queryFn: async (): Promise<ProductListing[]> => {
      const { data, error } = await supabase
        .from('product_listings')
        .select('id,product_id,outlet,status,url,price,listed_at,notes')
        .eq('product_id', productId!)
        .order('outlet');
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        price: r.price == null ? null : Number(r.price),
      })) as ProductListing[];
    },
  });
}

/** All listings grouped by product id — powers chips, filters and counts. */
export function useAllProductListings() {
  return useQuery({
    queryKey: ALL_KEY,
    queryFn: async (): Promise<Record<string, ProductListing[]>> => {
      const { data, error } = await supabase
        .from('product_listings')
        .select('id,product_id,outlet,status,url,price,listed_at,notes');
      if (error) throw error;
      const out: Record<string, ProductListing[]> = {};
      for (const r of (data ?? []) as any[]) {
        const row = { ...r, price: r.price == null ? null : Number(r.price) } as ProductListing;
        out[row.product_id] = [...(out[row.product_id] ?? []), row];
      }
      return out;
    },
  });
}

export function useProductListingMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = (productId?: string) => {
    qc.invalidateQueries({ queryKey: ALL_KEY });
    if (productId) qc.invalidateQueries({ queryKey: oneKey(productId) });
  };

  const upsert = useMutation({
    mutationFn: async (input: {
      product_id: string;
      outlet: string;
      status: string;
      url?: string | null;
      price?: number | null;
      listed_at?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from('product_listings').upsert(
        {
          product_id: input.product_id,
          outlet: input.outlet,
          status: input.status,
          url: input.url ?? null,
          price: input.price ?? null,
          listed_at: input.listed_at ?? null,
          notes: input.notes ?? null,
          created_by: user?.id ?? null,
        },
        { onConflict: 'product_id,outlet' },
      );
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidate(v.product_id),
  });

  const remove = useMutation({
    mutationFn: async ({ id }: { id: string; product_id: string }) => {
      const { error } = await supabase.from('product_listings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidate(v.product_id),
  });

  return { upsert, remove };
}
