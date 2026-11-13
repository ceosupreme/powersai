import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from '@/lib/batchFetch';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MY_BRAND_TYPES } from '@/hooks/usePortfolioData';

const KEY = ['crew-default-brands'];
/** All editors share one cached lookup; edits touch only the chosen crew's defaults. */
export function CrewDefaultBrands({ crewKey }: { crewKey: string }) {
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: KEY, enabled: isAdmin, staleTime: 60_000,
    queryFn: async () => {
      const [crews, brands] = await Promise.all([
        fetchAllPages<{ key: string; default_brand_ids: string[] | null }>(() => supabase.from('crews').select('key,default_brand_ids', { count: 'exact' }), ['key']),
        fetchAllPages<{ id: string; name: string }>(() => supabase.from('venues').select('id,name', { count: 'exact' }).in('project_type', [...MY_BRAND_TYPES]).or('is_prospect_shell.is.null,is_prospect_shell.eq.false').order('name')),
      ]);
      return { crews, brands };
    },
  });
  const selected = query.data?.crews.find((c) => c.key === crewKey)?.default_brand_ids ?? [];
  const save = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.rpc('hq_set_crew_default_brands', { p_crew_key: crewKey, p_brand_ids: ids });
      if (error) throw error;
    },
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: KEY }); },
  });
  if (!isAdmin) return null;
  const brands = query.data?.brands ?? [];
  return <div className="pt-2 space-y-2">
    <p className="text-sm font-medium">Default brands</p>
    <p className="text-sm text-muted-foreground">Future runs appear on these brands unless the run lists its own brands.</p>
    {query.isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading default brands" /> : query.error ? <p className="text-sm text-destructive">Couldn't load defaults.</p> : <>
      {!selected.length && <p className="text-sm text-muted-foreground">None — this crew must list brands on each run.</p>}
      <Button variant="ghost" size="sm" className="min-h-11 text-sm" aria-expanded={editing} onClick={() => setEditing((v) => !v)}><Pencil className="mr-1.5 h-4 w-4" />{editing ? 'Done choosing' : 'Edit brands'}</Button>
      <div className={cn('flex flex-wrap gap-2', editing && 'max-h-64 overflow-y-auto rounded-md border border-border p-2')}>
        {brands.filter((brand) => editing || selected.includes(brand.id)).map((brand) => {
          const on = selected.includes(brand.id);
          return <Button key={brand.id} variant="outline" size="sm" className={cn('min-h-11 h-auto whitespace-normal text-sm', on && 'border-primary bg-primary/10 text-primary')} aria-pressed={on} disabled={save.isPending} onClick={() => save.mutate(on ? selected.filter((id) => id !== brand.id) : [...selected, brand.id])}>
            {on && <Check className="mr-1 h-4 w-4 shrink-0" />}{brand.name}
          </Button>;
        })}
      </div>
    </>}
    {save.error && <p role="alert" className="text-sm text-destructive">Couldn't save defaults: {save.error.message}</p>}
  </div>;
}