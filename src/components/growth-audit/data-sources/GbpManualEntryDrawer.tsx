// Manual fallback for GBP snapshots. Operators can submit a snapshot when
// automated fetch is unavailable (no place_id mapped, scraping blocked, etc).
// Writes a `gbp_snapshots` row with source='manual' which the analyzer and
// scoring layer treat as a valid (lower-confidence) input.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { gbpStatusKey } from './useGbpStatus';
import { findingsKey } from '../findings/useFindings';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venueId: string;
  venueName: string;
};

type FormState = {
  primary_category: string;
  description: string;
  hours_complete: boolean;
  photo_count: string;
  last_photo_at: string;
  post_count: string;
  last_post_at: string;
  qa_unanswered: string;
  review_response_rate_30d: string;
  nap_match_name: boolean;
  nap_match_address: boolean;
  nap_match_phone: boolean;
  gbp_name: string;
  gbp_address: string;
  gbp_phone: string;
};

const blank: FormState = {
  primary_category: '',
  description: '',
  hours_complete: true,
  photo_count: '',
  last_photo_at: '',
  post_count: '',
  last_post_at: '',
  qa_unanswered: '',
  review_response_rate_30d: '',
  nap_match_name: true,
  nap_match_address: true,
  nap_match_phone: true,
  gbp_name: '',
  gbp_address: '',
  gbp_phone: '',
};

const num = (v: string): number | null => {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};
const dt = (v: string): string | null => (v.trim() ? new Date(v).toISOString() : null);

export const GbpManualEntryDrawer = ({ open, onOpenChange, venueId, venueName }: Props) => {
  const [form, setForm] = useState<FormState>(blank);
  const qc = useQueryClient();
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const payload = {
        venue_id: venueId,
        scope: 'manual',
        source: 'manual',
        captured_at: new Date().toISOString(),
        primary_category: form.primary_category.trim() || null,
        description: form.description.trim() || null,
        hours_complete: form.hours_complete,
        photo_count: num(form.photo_count),
        last_photo_at: dt(form.last_photo_at),
        post_count: num(form.post_count),
        last_post_at: dt(form.last_post_at),
        qa_unanswered: num(form.qa_unanswered),
        review_response_rate_30d: num(form.review_response_rate_30d),
        nap_match_name: form.nap_match_name,
        nap_match_address: form.nap_match_address,
        nap_match_phone: form.nap_match_phone,
        gbp_name: form.gbp_name.trim() || null,
        gbp_address: form.gbp_address.trim() || null,
        gbp_phone: form.gbp_phone.trim() || null,
      };
      const { error } = await supabase.from('gbp_snapshots').insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Manual GBP snapshot saved', {
        description: `Local visibility scoring will refresh on the next audit.`,
      });
      qc.invalidateQueries({ queryKey: gbpStatusKey(venueId) });
      qc.invalidateQueries({ queryKey: findingsKey(venueId) });
      setForm(blank);
      onOpenChange(false);
    },
    onError: (e) => toast.error('Failed to save snapshot', { description: (e as Error).message }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Submit Manual GBP Snapshot</SheetTitle>
          <SheetDescription>
            For <strong>{venueName}</strong>. Use this when automated fetch is unavailable. Marked as
            manual / lower confidence in the audit.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Profile</h3>
            <div>
              <Label htmlFor="cat">Primary category</Label>
              <Input id="cat" value={form.primary_category} placeholder="e.g. Bar"
                onChange={(e) => update('primary_category', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="desc">Business description</Label>
              <Textarea id="desc" rows={3} value={form.description}
                placeholder="200-400 character description shown on the GBP listing."
                onChange={(e) => update('description', e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded border border-border p-3">
              <div>
                <Label className="text-sm">Hours complete for all 7 days</Label>
                <p className="text-xs text-muted-foreground">Toggle off if any day is missing or marked closed unintentionally.</p>
              </div>
              <Switch checked={form.hours_complete} onCheckedChange={(v) => update('hours_complete', v)} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Engagement</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pc">Photo count</Label>
                <Input id="pc" type="number" min={0} value={form.photo_count}
                  onChange={(e) => update('photo_count', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lp">Last photo date</Label>
                <Input id="lp" type="date" value={form.last_photo_at}
                  onChange={(e) => update('last_photo_at', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="po">Post count</Label>
                <Input id="po" type="number" min={0} value={form.post_count}
                  onChange={(e) => update('post_count', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lpost">Last post date</Label>
                <Input id="lpost" type="date" value={form.last_post_at}
                  onChange={(e) => update('last_post_at', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="qa">Unanswered Q&amp;A</Label>
                <Input id="qa" type="number" min={0} value={form.qa_unanswered}
                  onChange={(e) => update('qa_unanswered', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rr">Review response rate (0-1)</Label>
                <Input id="rr" type="number" step="0.01" min={0} max={1} value={form.review_response_rate_30d}
                  onChange={(e) => update('review_response_rate_30d', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">NAP consistency</h3>
            <p className="text-xs text-muted-foreground">Toggle off any field where Google does NOT match the BarPulse record.</p>
            <div className="grid grid-cols-1 gap-2">
              {(['name', 'address', 'phone'] as const).map((f) => (
                <div key={f} className="flex items-center justify-between rounded border border-border p-2">
                  <Label className="text-sm capitalize">{f} matches</Label>
                  <Switch
                    checked={form[`nap_match_${f}` as const]}
                    onCheckedChange={(v) => update(`nap_match_${f}` as keyof FormState, v as never)}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Input placeholder="GBP name (optional)" value={form.gbp_name}
                onChange={(e) => update('gbp_name', e.target.value)} />
              <Input placeholder="GBP address (optional)" value={form.gbp_address}
                onChange={(e) => update('gbp_address', e.target.value)} />
              <Input placeholder="GBP phone (optional)" value={form.gbp_phone}
                onChange={(e) => update('gbp_phone', e.target.value)} />
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="gap-2">
              {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Snapshot
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
