import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

type Link = {
  id: string;
  campaign_id: string;
  outcome: 'Resolved' | 'Open' | 'Failed' | 'Inconclusive';
  confidence: 'High' | 'Medium' | 'Low';
  attribution_tier: 1 | 2 | 3;
  score_delta: number | null;
  created_at: string;
  notes: string | null;
};

const outcomeTone: Record<Link['outcome'], string> = {
  Resolved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  Failed: 'bg-destructive/10 text-destructive border-destructive/30',
  Open: 'bg-muted text-foreground border-border',
  Inconclusive: 'bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/30',
};

export const FindingCampaignsAttempted = ({ findingId }: { findingId: string }) => {
  const [rows, setRows] = useState<Link[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('finding_campaign_links')
        .select('id, campaign_id, outcome, confidence, attribution_tier, score_delta, created_at, notes')
        .eq('finding_id', findingId)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) { console.error('[FindingCampaignsAttempted]', error); setRows([]); return; }
      setRows((data ?? []) as Link[]);
      const ids = (data ?? []).map((r: any) => r.campaign_id);
      if (ids.length) {
        const { data: cs } = await supabase
          .from('marketing_campaigns')
          .select('id, title')
          .in('id', ids);
        const map: Record<string, string> = {};
        (cs ?? []).forEach((c: any) => { map[c.id] = c.title; });
        if (!cancelled) setTitles(map);
      }
    })();
    return () => { cancelled = true; };
  }, [findingId]);

  if (rows === null) return <div className="text-xs text-muted-foreground">Loading…</div>;
  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground">No campaigns linked to this finding yet.</div>;
  }

  return (
    <div className="space-y-2">
      {rows.map(r => (
        <button
          key={r.id}
          onClick={() => navigate(`/marketing-hub?campaign=${r.campaign_id}`)}
          className="w-full text-left p-2.5 rounded-md border border-border bg-card/50 hover:bg-card transition"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
              {titles[r.campaign_id] ?? r.campaign_id}
            </div>
            <Badge variant="outline" className={`text-[10px] ${outcomeTone[r.outcome]}`}>{r.outcome}</Badge>
            <Badge variant="outline" className="text-[10px]">Tier {r.attribution_tier}</Badge>
            <Badge variant="outline" className="text-[10px]">{r.confidence}</Badge>
            {r.score_delta != null && (
              <Badge variant="outline" className="text-[10px]">
                {r.score_delta >= 0 ? '+' : ''}${Math.round(r.score_delta).toLocaleString()} vs expected
              </Badge>
            )}
          </div>
          {r.notes && <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{r.notes}</div>}
          <div className="mt-1 text-[10px] text-muted-foreground">
            {new Date(r.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        </button>
      ))}
    </div>
  );
};
