import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDollars } from '@/lib/leakStackFormat';
import type { Prospect } from '@/hooks/useProspects';

interface Props {
  prospect: Prospect | null;
  onOpenChange: (v: boolean) => void;
}

export const ProspectCheckupDialog = ({ prospect, onOpenChange }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['prospect-checkup', prospect?.leak_run_id],
    enabled: !!prospect?.leak_run_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('leak_stack_runs')
        .select('results,total_monthly_dollars,total_risk_exposure_dollars,created_at')
        .eq('id', prospect!.leak_run_id)
        .maybeSingle();
      if (error) throw error;
      return data as {
        results: any[];
        total_monthly_dollars: number | null;
        total_risk_exposure_dollars: number | null;
        created_at: string;
      } | null;
    },
  });

  const rows = Array.isArray(data?.results) ? data!.results : [];

  return (
    <Dialog open={!!prospect} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkup — {prospect?.business_name}</DialogTitle>
          <DialogDescription>
            Estimated from public data and {prospect?.niche ?? 'vertical'} defaults. Not their actual books.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground py-6">Loading…</p>}
        {!isLoading && !rows.length && (
          <p className="text-sm text-muted-foreground py-6">No checkup rows on this prospect yet.</p>
        )}

        <div className="space-y-2">
          {rows.map((r: any, i: number) => (
            <div key={i} className="rounded-lg border border-border/60 p-3 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium">{r.name}</span>
                <span className="text-sm tabular-nums">
                  {r.monthly_dollars == null ? '—' : `${formatDollars(r.monthly_dollars)}/mo`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {r.risk_type === 'avoided_loss' ? 'risk exposure' : 'recoverable'}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{r.severity}</Badge>
                <Badge variant="outline" className="text-[10px]">
                  {r.monthly_dollars == null ? (r.reason ?? 'not computed') : 'estimate'}
                </Badge>
              </div>
              {r.benchmark && (
                <p className="text-[11px] text-muted-foreground">{r.benchmark}</p>
              )}
            </div>
          ))}
        </div>

        {data && (
          <div className="border-t border-border/60 pt-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated recoverable</span>
              <span className="tabular-nums font-semibold">
                {formatDollars(data.total_monthly_dollars)}/mo
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated risk exposure</span>
              <span className="tabular-nums font-semibold">
                {formatDollars(data.total_risk_exposure_dollars)}/mo
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};