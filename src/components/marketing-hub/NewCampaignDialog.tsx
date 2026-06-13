// New / Edit campaign dialog. Used by:
//   - "New Campaign" buttons in OverviewView and CampaignsView (Path 1)
//   - "Edit campaign" / "Fill in BarPulse" actions in CampaignDetail
//
// On create with origin=manual_barpulse, if the venue has live_writes_enabled
// in venue_execution_adapters, we trigger an Asana push immediately so the
// new BarPulse campaign and the Asana task share an external_id from creation.

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useVenues } from '@/hooks/useVenueData';
import { useCampaignStore, newCampaignId } from './useCampaignStore';
import { getAdapter } from './adapters/registry';
import {
  CAMPAIGN_TYPES, type Campaign, type CampaignType, type MarketingChannel,
  type Recurrence,
} from './types';
import { cn } from '@/lib/utils';

const CHANNELS: MarketingChannel[] = [
  'Instagram', 'Facebook', 'TikTok', 'Email', 'SMS', 'Google Business Profile',
  'In-Venue Signage', 'Staff Upsell', 'Paid Ads', 'Influencer', 'Press',
];
const RECURRENCES: Recurrence[] = ['One-Time', 'Weekly', 'Biweekly', 'Monthly', 'Custom'];

type Mode = 'create' | 'edit';

export const NewCampaignDialog = ({
  open, onOpenChange, initialCampaign, mode = 'create', onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialCampaign?: Campaign | null;
  mode?: Mode;
  onSaved?: (c: Campaign) => void;
}) => {
  const { toast } = useToast();
  const { add, update } = useCampaignStore();
  const { data: venues = [] } = useVenues();

  const blank = (): Partial<Campaign> => ({
    title: '',
    type: 'Daily Special',
    status: 'Draft',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
    description: '',
    objective: '',
    recurrence: 'One-Time',
    targetAudience: '',
    channels: [],
    linkedMenuItems: [],
    successMetric: '',
    attachments: [],
    venueId: venues[0]?.id ?? '',
    venueName: venues[0]?.name ?? '',
  });

  const [form, setForm] = useState<Partial<Campaign>>(blank());
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialCampaign) {
      setForm(initialCampaign);
      setShowMore(true);
    } else {
      setForm(blank());
      setShowMore(false);
    }
  }, [open, initialCampaign?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Campaign>(k: K, v: Campaign[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const toggleChannel = (ch: MarketingChannel) => {
    const cur = form.channels ?? [];
    set('channels', cur.includes(ch) ? cur.filter(x => x !== ch) : [...cur, ch]);
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.title?.trim()) e.title = 'Title is required';
    if (!form.type) e.type = 'Type is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.endDate) e.endDate = 'End date is required';
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      e.endDate = 'End must be on or after start';
    }
    if (!form.description?.trim()) e.description = 'Description is required';
    if (!form.objective?.trim()) e.objective = 'Objective is required';
    if (!form.venueId) e.venueId = 'Venue is required';
    return e;
  }, [form]);

  const handleSubmit = async () => {
    if (Object.keys(errors).length > 0) {
      toast({ title: 'Fill in required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      let saved: Campaign;
      if (mode === 'edit' && initialCampaign) {
        saved = await update(initialCampaign.id, form);
        toast({ title: 'Campaign updated' });
      } else {
        const venue = venues.find(v => v.id === form.venueId);
        const now = new Date().toISOString();
        const c: Campaign = {
          id: newCampaignId(),
          venueId: form.venueId!,
          venueName: venue?.name ?? form.venueName ?? '—',
          origin: 'manual_barpulse',
          title: form.title!,
          type: form.type as CampaignType,
          status: 'Draft',
          startDate: form.startDate!,
          endDate: form.endDate!,
          startTime: form.startTime,
          endTime: form.endTime,
          description: form.description!,
          objective: form.objective!,
          recurrence: form.recurrence as Recurrence,
          targetAudience: form.targetAudience ?? '',
          channels: form.channels ?? [],
          brandPartner: form.brandPartner ?? null,
          brandPartnerContribution: form.brandPartnerContribution ?? null,
          budget: form.budget ?? null,
          expectedGuestCount: form.expectedGuestCount ?? null,
          expectedRevenueImpact: form.expectedRevenueImpact ?? null,
          linkedToastPromoCode: form.linkedToastPromoCode ?? null,
          linkedMenuItems: form.linkedMenuItems ?? [],
          successMetric: form.successMetric ?? '',
          assignedTo: form.assignedTo ?? null,
          internalNotes: form.internalNotes ?? undefined,
          attachments: form.attachments ?? [],
          executionAdapter: { adapter_type: 'asana', sync_status: 'Not Synced' },
          createdAt: now,
          updatedAt: now,
          needsDetails: false,
          missingFields: [],
        };
        saved = await add(c);

        // Auto-push to Asana if live writes are enabled for this venue.
        try {
          const { data: cfg } = await supabase
            .from('venue_execution_adapters')
            .select('live_writes_enabled')
            .eq('venue_id', saved.venueId)
            .maybeSingle();
          if (cfg?.live_writes_enabled) {
            const adapter = getAdapter('asana');
            const { adapter: rec } = await adapter.push(saved, []);
            saved = await update(saved.id, {
              executionAdapter: rec, lastSyncedFrom: 'barpulse',
            });
            toast({ title: 'Created and pushed to Asana', description: `Task ${rec.external_id}` });
          } else {
            toast({
              title: 'Campaign saved as Draft',
              description: 'Configure Asana in Admin → Marketing Hub to enable auto-push.',
            });
          }
        } catch (e: any) {
          toast({
            title: 'Saved, but Asana push failed',
            description: e?.message ?? 'Use the Execution Adapter panel to retry.',
            variant: 'destructive',
          });
        }
      }
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message ?? String(e), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit campaign' : 'New campaign'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the campaign blueprint. If synced to Asana, your edits will push on next sync.'
              : 'Required fields only by default — expand "Add more details" for the full blueprint.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Field label="Title" error={errors.title} required>
            <Input
              value={form.title ?? ''}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Tuesday Trivia Revival"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Venue" error={errors.venueId} required>
              <select
                value={form.venueId ?? ''}
                onChange={e => {
                  const v = venues.find(x => x.id === e.target.value);
                  set('venueId', e.target.value);
                  if (v) set('venueName', v.name);
                }}
                className="h-9 w-full px-3 text-sm rounded-md border border-input bg-background"
              >
                <option value="">Select…</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Type" error={errors.type} required>
              <select
                value={form.type ?? 'Daily Special'}
                onChange={e => set('type', e.target.value as CampaignType)}
                className="h-9 w-full px-3 text-sm rounded-md border border-input bg-background"
              >
                {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" error={errors.startDate} required>
              <Input type="date" value={form.startDate ?? ''} onChange={e => set('startDate', e.target.value)} />
            </Field>
            <Field label="End date" error={errors.endDate} required>
              <Input type="date" value={form.endDate ?? ''} onChange={e => set('endDate', e.target.value)} />
            </Field>
          </div>

          <Field label="Description" error={errors.description} required>
            <Textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="What's the offer / event / push?"
            />
          </Field>
          <Field label="Objective" error={errors.objective} required>
            <Textarea
              value={form.objective ?? ''}
              onChange={e => set('objective', e.target.value)}
              rows={2}
              placeholder="Lift Tuesday covers by 25%, drive 200 ticket sales, etc."
            />
          </Field>

          <Collapsible open={showMore} onOpenChange={setShowMore}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
              <ChevronDown className={cn('w-4 h-4 transition-transform', showMore && 'rotate-180')} />
              Add more details
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start time"><Input type="time" value={form.startTime ?? ''} onChange={e => set('startTime', e.target.value)} /></Field>
                <Field label="End time"><Input type="time" value={form.endTime ?? ''} onChange={e => set('endTime', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Recurrence">
                  <select
                    value={form.recurrence ?? 'One-Time'}
                    onChange={e => set('recurrence', e.target.value as Recurrence)}
                    className="h-9 w-full px-3 text-sm rounded-md border border-input bg-background"
                  >
                    {RECURRENCES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Assigned to">
                  <Input value={form.assignedTo ?? ''} onChange={e => set('assignedTo', e.target.value)} placeholder="Maya R." />
                </Field>
              </div>

              <Field label="Target audience">
                <Input value={form.targetAudience ?? ''} onChange={e => set('targetAudience', e.target.value)} placeholder="Local 25-40 weekday after-work crowd" />
              </Field>

              <Field label="Channels">
                <div className="flex flex-wrap gap-1.5">
                  {CHANNELS.map(ch => {
                    const on = (form.channels ?? []).includes(ch);
                    return (
                      <button
                        key={ch} type="button" onClick={() => toggleChannel(ch)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-full border transition-colors',
                          on
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600'
                            : 'border-border text-muted-foreground hover:bg-muted/40',
                        )}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand partner">
                  <Input value={form.brandPartner ?? ''} onChange={e => set('brandPartner', e.target.value)} placeholder="San Diego Humane Society" />
                </Field>
                <Field label="Partner contribution ($)">
                  <Input type="number" value={form.brandPartnerContribution ?? ''} onChange={e => set('brandPartnerContribution', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Budget ($)">
                  <Input type="number" value={form.budget ?? ''} onChange={e => set('budget', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
                <Field label="Expected guests">
                  <Input type="number" value={form.expectedGuestCount ?? ''} onChange={e => set('expectedGuestCount', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
                <Field label="Expected revenue ($)">
                  <Input type="number" value={form.expectedRevenueImpact ?? ''} onChange={e => set('expectedRevenueImpact', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Toast promo code">
                  <Input value={form.linkedToastPromoCode ?? ''} onChange={e => set('linkedToastPromoCode', e.target.value)} placeholder="TRIVIA5" />
                </Field>
                <Field label="Linked menu items (comma-separated)">
                  <Input
                    value={(form.linkedMenuItems ?? []).join(', ')}
                    onChange={e => set('linkedMenuItems', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Loaded Nachos, Wings"
                  />
                </Field>
              </div>

              <Field label="Success metric">
                <Input value={form.successMetric ?? ''} onChange={e => set('successMetric', e.target.value)} placeholder="Tuesday net sales 7-11pm" />
              </Field>

              <Field label="Internal notes">
                <Textarea value={form.internalNotes ?? ''} onChange={e => set('internalNotes', e.target.value)} rows={2} />
              </Field>

              {mode === 'edit' && initialCampaign?.needsDetails && (initialCampaign.missingFields ?? []).length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
                  <div className="font-medium text-amber-700 mb-1">Missing fields flagged from Asana</div>
                  <div className="flex flex-wrap gap-1">
                    {initialCampaign.missingFields!.map(f => (
                      <Badge key={f} variant="outline" className="text-[10px] border-amber-500/40 text-amber-700">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === 'edit' ? 'Save changes' : 'Create campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label, children, error, required,
}: { label: string; children: React.ReactNode; error?: string; required?: boolean }) => (
  <div className="space-y-1">
    <Label className="text-xs">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {error && <div className="text-[11px] text-destructive">{error}</div>}
  </div>
);
