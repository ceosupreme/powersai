import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUpsertFoundationItemStatus } from '@/hooks/useFoundationItemStatus';
import { composePipeline } from '@/lib/pipelineComposer';
import { pipelineHref } from '@/lib/ownerWork';
import { laneScore } from '@/lib/effectiveFoundation';
import { formatCurrency } from '@/utils/formatting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function pacificMonth(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value ?? '';
  const month = parts.find(p => p.type === 'month')?.value ?? '';
  return year + '-' + month;
}

export function RevenueLaneCard({ item, projectId, canEdit }: { item: any; projectId: string; canEdit: boolean }) {
  const upsert = useUpsertFoundationItemStatus();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [proof, setProof] = useState('');
  const [confirmationNote, setConfirmationNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(pacificMonth());
  const [earningsNote, setEarningsNote] = useState('');
  const [earningProof, setEarningProof] = useState('');
  const [busy, setBusy] = useState(false);
  const score = laneScore(item);
  const running = item.status === 'satisfied';
  const earningRows = useQuery({
    queryKey: ['revenue-lane-entries', projectId, item.item_key],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('channel_revenue')
        .select('amount,period_month,entry_source,evidence_url')
        .eq('project_id', projectId).eq('lane_item_key', item.item_key);
      if (error) throw error;
      return (data ?? []) as { amount: number; period_month: string; entry_source: string | null; evidence_url: string | null }[];
    },
  });
  const thisMonth = pacificMonth();
  const recordedNow = (earningRows.data ?? []).filter(r => String(r.period_month).startsWith(thisMonth))
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const recordedTotal = (earningRows.data ?? []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const startPlan = async () => {
    if (!canEdit || busy) return;
    setBusy(true);
    try {
      const { jobId } = await composePipeline({
        project_id: projectId, kind: 'lane',
        title: 'Activate revenue opportunity: ' + item.label,
        target_key: item.item_key, lane_item_key: item.item_key, level: 2,
        goal_text: 'Activate ' + item.label + ' and begin recording real earnings',
      });
      toast.success('Setup plan ready. Opening its first step.');
      navigate(pipelineHref(projectId, jobId));
    } catch (e: any) { toast.error(e?.message ?? 'Could not create a setup plan.'); }
    finally { setBusy(false); }
  };
  const markAlreadyRunning = async () => {
    if (!confirmed || (!proof.trim() && !confirmationNote.trim())) return;
    if (proof.trim()) {
      try { const url = new URL(proof.trim()); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
      catch { return toast.error('Enter a valid evidence URL or leave it blank and explain in notes.'); }
    }
    setBusy(true);
    try {
      await upsert.mutateAsync({
        venue_id: projectId, item_key: item.item_key, status: 'satisfied',
        evidence_url: proof.trim() || null,
        source: 'manual',
        detected_at: new Date().toISOString(),
        notes: 'Operator confirmed this opportunity is operating. ' + confirmationNote.trim(),
      } as any);
      toast.success('Recorded as running, based on your confirmation. No earnings were inferred.');
      setConfirming(false); setConfirmed(false); setProof(''); setConfirmationNote('');
    } catch (e: any) { toast.error(e?.message ?? 'Could not record the confirmation.'); }
    finally { setBusy(false); }
  };
  const recordIncome = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || !value || !/^\d{4}-\d{2}$/.test(month)) {
      return toast.error('Enter a nonzero amount and a valid month.');
    }
    if (!earningsNote.trim()) return toast.error('Add a short description of where this income came from.');
    if (earningProof.trim()) {
      try { const u = new URL(earningProof.trim()); if (!['http:', 'https:'].includes(u.protocol)) throw new Error(); }
      catch { return toast.error('Enter a valid income evidence URL or leave it empty.'); }
    }
    setBusy(true);
    try {
      const { error } = await (supabase as any).from('channel_revenue').insert({
        project_id: projectId, lane_item_key: item.item_key, entry_source: 'manual',
        revenue_type: 'manual_lane_income', amount: value,
        period_month: month + '-01', evidence_url: earningProof.trim() || null,
        source_note: item.label + ': ' + earningsNote.trim(),
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['revenue-lane-entries', projectId, item.item_key] });
      await qc.invalidateQueries({ queryKey: ['brand-work-summary'] });
      toast.success('Manually reported income saved separately from estimates.');
      setAmount(''); setEarningsNote(''); setEarningProof(''); setRecording(false);
    } catch (e: any) { toast.error(e?.message ?? 'Could not save the revenue entry.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border-2 border-gold/40 bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{item.label}</p>
        <Badge variant="outline" className="text-[10px] capitalize">{item.severity}</Badge>
      </div>
      {item.recommended_fix && <p className="text-sm text-muted-foreground">{item.recommended_fix}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div><p className="text-xl font-bold">{score == null ? '—' : formatCurrency(Math.round(score))}</p>
          <p className="text-xs text-muted-foreground">Estimated return per hour of work</p></div>
        <div><p className="text-xl font-bold">{item.est_dollars_90d == null ? '—' : formatCurrency(Number(item.est_dollars_90d))}</p>
          <p className="text-xs text-muted-foreground">Potential in 90 days (not earned)</p></div>
      </div>
      <p className="text-xs">Status: <strong>{running ? 'Running (as reported)' : String(item.status).replace(/_/g, ' ')}</strong></p>
      {running && <div className="rounded-lg border p-3">
        <p className="font-medium">Recorded income from this opportunity</p>
        {earningRows.isError ? <p className="text-xs text-destructive">Income records could not be loaded.</p>
          : earningRows.isLoading ? <p className="text-xs text-muted-foreground">Checking actual entries…</p>
          : <div className="mt-2 flex flex-wrap gap-4">
              <div><p className="text-lg font-semibold">{formatCurrency(recordedNow)}</p><p className="text-xs text-muted-foreground">This month</p></div>
              <div><p className="text-lg font-semibold">{formatCurrency(recordedTotal)}</p><p className="text-xs text-muted-foreground">All recorded entries</p></div>
            </div>}
        <p className="mt-2 text-xs text-muted-foreground">Only entered earnings count here; activation and forecasts do not count as revenue.</p>
        {canEdit && !recording && <Button className="mt-3" size="sm" variant="outline" onClick={() => setRecording(true)}>Record actual earnings</Button>}
      </div>}
      {canEdit && !running && !confirming && <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={startPlan}>Make a plan to start this</Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>This is already running</Button>
      </div>}
      {canEdit && confirming && <div className="rounded-lg border p-3 space-y-2">
        <p className="text-sm font-medium">Confirm that this opportunity is actually operating</p>
        <p className="text-xs text-muted-foreground">This records setup status only. It will not connect an account or record revenue.</p>
        <Input value={proof} onChange={e => setProof(e.target.value)} placeholder="Account, listing or program URL (optional)" />
        <Textarea rows={2} value={confirmationNote} onChange={e => setConfirmationNote(e.target.value)} placeholder="How do you know this is already running?"/>
        <label className="flex gap-2 text-xs items-start"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I confirm that this is already set up and operating.</label>
        <div className="flex gap-2">
          <Button size="sm" disabled={busy || !confirmed || (!proof.trim() && !confirmationNote.trim())} onClick={markAlreadyRunning}>Save confirmation</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
        </div>
      </div>}
      {canEdit && running && recording && <div className="rounded-lg border p-3 space-y-2">
        <p className="text-sm font-medium">Record money actually earned</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1"><span className="text-xs">Amount (USD, negative for corrections)</span><Input inputMode="decimal" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}/></label>
          <label className="space-y-1"><span className="text-xs">Earning month</span><Input type="month" value={month} onChange={e => setMonth(e.target.value)}/></label>
        </div>
        <Input value={earningsNote} onChange={e => setEarningsNote(e.target.value)} placeholder="Payment or sale description"/>
        <Input value={earningProof} onChange={e => setEarningProof(e.target.value)} placeholder="Evidence URL (optional)"/>
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={recordIncome}>Save manual income entry</Button>
          <Button size="sm" variant="ghost" onClick={() => setRecording(false)}>Cancel</Button>
        </div>
      </div>}
    </div>
  );
}
