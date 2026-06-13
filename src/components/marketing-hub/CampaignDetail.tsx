import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import {
  CalendarRange, Clock, Target, Users, Megaphone, Handshake, DollarSign,
  Tag, UtensilsCrossed, BarChart3, UserCheck, FileText, Paperclip,
  ArrowRight, ArrowUpRightFromCircle, ExternalLink, AlertCircle,
  Sparkles, Loader2, CheckCircle2,
} from 'lucide-react';
import { useCampaignStore } from './useCampaignStore';
import { StatusBadge, OriginBadge, TypeBadge, SyncStatusBadge, RecommendationBadge } from './badges';
import { ExecutionAdapterPanel } from './ExecutionAdapterPanel';
import { CampaignResultsCard } from './CampaignResultsCard';
import { NewCampaignDialog } from './NewCampaignDialog';
import { useState, useEffect } from 'react';
import type { Campaign } from './types';
import { generateActionPack } from '@/components/growth-audit/action-packs/generateActionPack';
import { upsertPack, useActionPacksStore, useActionPacksLoader } from '@/components/growth-audit/action-packs/useActionPacks';
import { toast } from 'sonner';

const fmt$ = (n?: number | null) => n == null ? '—' : `$${Math.round(n).toLocaleString()}`;
const fmtPct = (n?: number) => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtDate = (d?: string | null) =>
  !d ? '—' : new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtDay = (d: string) =>
  new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const Row = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-2">
    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  </div>
);

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-sm font-semibold ${accent ?? 'text-foreground'}`}>{value}</div>
  </div>
);

export const CampaignDetail = ({
  campaignId, open, onOpenChange,
}: {
  campaignId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { get, update } = useCampaignStore();
  const base = campaignId ? get(campaignId) : null;
  const [c, setC] = useState<Campaign | null>(base ?? null);
  const [editOpen, setEditOpen] = useState(false);
  useEffect(() => { setC(base ?? null); }, [campaignId, base?.id, base?.updatedAt]);

  // Persist any adapter-driven mutation back to the store.
  const handleCampaignChange = async (next: Campaign) => {
    setC(next);
    if (campaignId) {
      try { await update(campaignId, next); } catch (e) { console.error(e); }
    }
  };

  const permalink = (c?.executionAdapter as any)?.permalink_url as string | undefined;
  const showAsanaLink = !!c?.executionAdapter?.external_id &&
    (c.origin === 'manual_external' || c.executionAdapter.sync_status === 'Synced');

  // Marketing Assets — Action Pack generation tied to this campaign.
  const { packs } = useActionPacksStore();
  useActionPacksLoader(c?.venueId);
  const campaignPack = c
    ? packs.find(p => p.findingId === `campaign:${c.id}`)
    : undefined;
  const [generating, setGenerating] = useState(false);

  const handleGenerateContent = async () => {
    if (!c) return;
    setGenerating(true);
    try {
      const pack = await generateActionPack(
        {
          kind: 'campaign',
          campaign: {
            id: c.id,
            type: c.type,
            title: c.title,
            venueId: c.venueId,
            description: c.description,
            targetAudience: c.targetAudience,
            channels: c.channels,
            brandPartner: c.brandPartner,
            linkedMenuItems: c.linkedMenuItems,
          },
        },
        { venueId: c.venueId, venueName: c.venueName },
      );
      upsertPack(pack);
      toast.success(`Generated ${pack.assets.length} marketing asset${pack.assets.length === 1 ? '' : 's'}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {!c ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Campaign not found.</div>
        ) : (
          <>
            <SheetHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={c.status} />
                <OriginBadge origin={c.origin} subsource={c.externalSubsource} />
                <TypeBadge type={c.type} />
                {c.needsDetails && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-700">
                    <AlertCircle className="w-3 h-3" /> Needs details
                  </span>
                )}
              </div>
              <SheetTitle className="text-xl text-left">{c.title}</SheetTitle>
              <div className="text-sm text-muted-foreground text-left flex items-center gap-3 flex-wrap">
                <span>{c.venueName}</span>
                {showAsanaLink && permalink && (
                  <a href={permalink} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-xs">
                    View in Asana <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {c.origin === 'growth_audit' && c.originatingFindingId && (
                <Button
                  variant="outline" size="sm" className="self-start gap-2"
                  onClick={() => navigate(`/growth-audit?subtab=findings&finding=${c.originatingFindingId}`)}
                >
                  <ArrowUpRightFromCircle className="w-3.5 h-3.5" />
                  From Finding · {c.originatingFindingId}
                </Button>
              )}
              {c.needsDetails && (c.missingFields ?? []).length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-left">
                  <div className="font-medium text-amber-700 mb-1">Missing fields from Asana ingestion</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {c.missingFields!.map(f => (
                      <Badge key={f} variant="outline" className="text-[10px] border-amber-500/40 text-amber-700">{f}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>Fill in BarPulse</Button>
                    {permalink && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={permalink} target="_blank" rel="noreferrer">Open in Asana</a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </SheetHeader>


            <div className="mt-6 space-y-5">
              {/* Schedule */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2 text-foreground">Schedule</h3>
                <Row icon={CalendarRange} label="Window">
                  {fmtDay(c.startDate)} — {fmtDay(c.endDate)}
                </Row>
                {(c.startTime || c.endTime) && (
                  <Row icon={Clock} label="Time of day">
                    {c.startTime ?? '—'} – {c.endTime ?? '—'}
                  </Row>
                )}
                <Row icon={CalendarRange} label="Recurrence">{c.recurrence}</Row>
              </Card>

              {/* Description / Objective */}
              <Card className="p-4 space-y-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Description</div>
                  <p className="text-sm text-foreground mt-1">{c.description}</p>
                </div>
                <Row icon={Target} label="Objective">{c.objective}</Row>
                <Row icon={Users} label="Target audience">{c.targetAudience}</Row>
                <Row icon={BarChart3} label="Success metric">{c.successMetric}</Row>
              </Card>

              {/* Channels / partner / linked */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2 text-foreground">Distribution & Linkage</h3>
                <Row icon={Megaphone} label="Channels">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.channels.length === 0 ? '—' : c.channels.map(ch => (
                      <Badge key={ch} variant="outline" className="text-[10px] text-muted-foreground border-border/60">{ch}</Badge>
                    ))}
                  </div>
                </Row>
                {c.brandPartner && (
                  <Row icon={Handshake} label="Brand partner">
                    {c.brandPartner}
                    {c.brandPartnerContribution != null && (
                      <span className="text-muted-foreground"> · contributing {fmt$(c.brandPartnerContribution)}</span>
                    )}
                  </Row>
                )}
                <Row icon={Tag} label="Toast promo code">
                  {c.linkedToastPromoCode ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.linkedToastPromoCode}</code> : '—'}
                </Row>
                <Row icon={UtensilsCrossed} label="Linked menu items">
                  {c.linkedMenuItems.length === 0 ? '—' : c.linkedMenuItems.join(', ')}
                </Row>
              </Card>

              {/* Budget & expectations */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground">Budget & Expected Impact</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Budget" value={fmt$(c.budget)} />
                  <Stat label="Expected guests" value={c.expectedGuestCount?.toLocaleString() ?? '—'} />
                  <Stat label="Expected revenue" value={fmt$(c.expectedRevenueImpact)} />
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-2 gap-4">
                  <Row icon={UserCheck} label="Assigned to">{c.assignedTo ?? 'Unassigned'}</Row>
                  <Row icon={DollarSign} label="Created / updated">
                    {new Date(c.createdAt).toLocaleDateString()} · upd {new Date(c.updatedAt).toLocaleDateString()}
                  </Row>
                </div>
              </Card>

              {/* Execution adapter (generic, dry-run-first) */}
              <ExecutionAdapterPanel campaign={c} onCampaignChange={handleCampaignChange} />

              {/* Marketing Assets — campaign-context Action Pack */}
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Marketing Assets
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generate copy, social posts, and briefs tied to this campaign.
                    </p>
                  </div>
                  <Button size="sm" onClick={handleGenerateContent} disabled={generating} className="gap-2 shrink-0">
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {campaignPack ? 'Regenerate' : 'Generate Content'}
                  </Button>
                </div>
                {campaignPack && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {campaignPack.assets.length} asset{campaignPack.assets.length === 1 ? '' : 's'} ·
                      generated {new Date(campaignPack.generatedAt).toLocaleString()}
                    </div>
                    <ul className="text-xs text-foreground space-y-1 pl-1">
                      {campaignPack.assets.slice(0, 6).map(a => (
                        <li key={a.id} className="flex items-center gap-2">
                          <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground" />
                          <span className="truncate">{a.title}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">{a.kind.replace('_', ' ')}</Badge>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="ghost" size="sm"
                      className="text-xs gap-1"
                      onClick={() => navigate(`/growth-audit?subtab=action-center&source=campaign:${c.id}`)}
                    >
                      Open in Action Center <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </Card>

              {/* Post-event analysis (Prompt 10). Visible whenever ended/archived. */}
              {(c.status === 'Ended' || c.status === 'Archived') && (
                <CampaignResultsCard campaign={c} onCampaignChange={handleCampaignChange} />
              )}

              {/* Notes / attachments */}
              {(c.internalNotes || c.attachments.length > 0) && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-2 text-foreground">Internal</h3>
                  {c.internalNotes && (
                    <Row icon={FileText} label="Notes">{c.internalNotes}</Row>
                  )}
                  {c.attachments.length > 0 && (
                    <Row icon={Paperclip} label="Attachments">
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {c.attachments.map(a => (
                          <Badge key={a.id} variant="outline" className="text-xs">{a.label}</Badge>
                        ))}
                      </div>
                    </Row>
                  )}
                </Card>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 pb-4">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
                  Edit campaign <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <NewCampaignDialog
              open={editOpen} onOpenChange={setEditOpen}
              mode="edit" initialCampaign={c} onSaved={setC}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
