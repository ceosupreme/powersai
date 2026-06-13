// Inline panel that augments the GBP source card with live status,
// a manual-entry trigger, and (when admin) a place-resolve action.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertTriangle, CheckCircle2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useGbpStatus, gbpStatusKey } from './useGbpStatus';
import { GbpManualEntryDrawer } from './GbpManualEntryDrawer';

type Props = { venueId: string; venueName: string };

export const GbpLiveExtras = ({ venueId, venueName }: Props) => {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useGbpStatus(venueId);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const qc = useQueryClient();

  const handleResolve = async () => {
    setResolving(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('gbp-resolve-place', {
        body: { venue_id: venueId, query: venueName },
      });
      if (error) throw error;
      toast.success('Place resolution attempted', {
        description: (res as any)?.place_id
          ? `Resolved place ID: ${(res as any).place_id}`
          : 'No place ID resolved — try manual entry.',
      });
      qc.invalidateQueries({ queryKey: gbpStatusKey(venueId) });
    } catch (e) {
      toast.error('Resolve failed', { description: (e as Error).message });
    } finally {
      setResolving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin inline mr-2" />
        Checking GBP connection for {venueName}…
      </Card>
    );
  }

  const mapping = data?.mapping;
  const snap = data?.snapshot;
  const failures = mapping?.consecutive_fetch_failures ?? 0;

  return (
    <>
      <Card className="p-4 border-l-4 border-l-sky-500/60">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-foreground">Google Business Profile · {venueName}</h4>
              <Badge variant="outline" className="text-[10px]">{data?.status ?? 'Not Connected'}</Badge>
              {snap && (
                <Badge variant="outline" className="text-[10px] bg-muted/40">
                  {snap.source} · {data?.lastSyncLabel}
                </Badge>
              )}
            </div>

            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {mapping?.place_id ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="font-mono">{mapping.place_id}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  No place ID mapped — automated sync disabled.
                </div>
              )}
              {failures >= 3 && (
                <div className="flex items-center gap-1.5 text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  {failures} consecutive fetch failures.
                  {mapping?.last_resolve_error ? ` Last error: ${mapping.last_resolve_error}` : ''}
                </div>
              )}
              {!snap && !mapping?.place_id && (
                <p>Submit a manual snapshot to unlock Local Search Visibility scoring.</p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
                <Settings2 className="w-3 h-3" />
                Submit Manual Snapshot
              </Button>
              {isAdmin && (
                <Button size="sm" variant="ghost" disabled={resolving} onClick={handleResolve} className="gap-1.5">
                  {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                  Resolve Place ID
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <GbpManualEntryDrawer
        open={open}
        onOpenChange={setOpen}
        venueId={venueId}
        venueName={venueName}
      />
    </>
  );
};
