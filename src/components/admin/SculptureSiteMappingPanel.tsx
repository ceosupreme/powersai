import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVenues } from '@/hooks/useVenueData';
import { useToast } from '@/hooks/use-toast';

interface SiteMapping {
  id: string;
  site_id: string;
  venue_id: string;
}

export const SculptureSiteMappingPanel = () => {
  const { data: venues = [] } = useVenues();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery<SiteMapping[]>({
    queryKey: ['sculpture-site-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sculpture_site_mappings')
        .select('id, site_id, venue_id')
        .order('site_id');
      if (error) throw error;
      return (data ?? []) as SiteMapping[];
    },
  });

  const [newSiteId, setNewSiteId] = useState('');
  const [newVenueId, setNewVenueId] = useState('');

  const addMutation = useMutation({
    mutationFn: async ({ site_id, venue_id }: { site_id: string; venue_id: string }) => {
      const { error } = await supabase
        .from('sculpture_site_mappings')
        .insert({ site_id, venue_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sculpture-site-mappings'] });
      setNewSiteId('');
      setNewVenueId('');
      toast({ title: 'Mapping added' });
    },
    onError: (err: Error) => {
      toast({ title: 'Could not add mapping', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sculpture_site_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sculpture-site-mappings'] });
      toast({ title: 'Mapping removed' });
    },
  });

  const venueName = (id: string) => venues.find(v => v.id === id)?.name ?? '—';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="h-4 w-4 text-primary" />
          Sculpture Site IDs
        </CardTitle>
        <CardDescription>
          Map each Sculpture site ID (the digits in <code className="text-xs">INV_<b>19969</b>_SITENUM_…</code>) to a venue.
          Add each venue once — uploads then auto-detect their venue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : mappings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No mappings yet. Add one below.</p>
        ) : (
          <div className="space-y-1">
            {mappings.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-sm border border-border/40 rounded-md px-2 py-1.5">
                <span className="font-mono text-xs bg-muted/40 px-2 py-0.5 rounded">{m.site_id}</span>
                <span className="text-muted-foreground">→</span>
                <span className="flex-1">{venueName(m.venue_id)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(m.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 pt-2 border-t border-border/40">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Site ID</label>
            <Input
              value={newSiteId}
              onChange={e => setNewSiteId(e.target.value.replace(/\D/g, ''))}
              placeholder="19969"
              className="h-9 w-28 text-sm font-mono"
            />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-xs text-muted-foreground">Venue</label>
            <Select value={newVenueId} onValueChange={setNewVenueId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={() => addMutation.mutate({ site_id: newSiteId, venue_id: newVenueId })}
            disabled={!newSiteId || !newVenueId || addMutation.isPending}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
