import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, ArrowRightCircle, Archive, Eye, Building2, Loader2, Siren, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  useInboundLeads, useInboundLeadMutations, useInboundLeadResponseStats,
  type InboundLeadStatus, type InboundLead, type UrgencyClass,
} from "@/hooks/useInboundLeads";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";
import { useLeadProposal, type ProjectSetupProposal } from "@/hooks/useLeadProposal";
import { EditBarDialog } from "@/components/admin/EditBarDialog";
import { VenueOnboardingWizard } from "@/components/onboarding/VenueOnboardingWizard";
import { cn } from "@/lib/utils";

const URGENCY_LABEL: Record<UrgencyClass, string> = {
  emergency: "EMERGENCY",
  same_day: "Same day",
  routine: "Routine",
  estimate: "Estimate",
  maintenance: "Maintenance",
};

function UrgencyBadge({ cls }: { cls: UrgencyClass }) {
  if (cls === "emergency") {
    return (
      <Badge className="text-[10px] bg-orange-700 hover:bg-orange-700 text-white gap-1">
        <Siren className="h-3 w-3" /> EMERGENCY
      </Badge>
    );
  }
  if (cls === "same_day") {
    return <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500 text-white">Same day</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px]">{URGENCY_LABEL[cls]}</Badge>;
}

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function EmergencyTimer({ since }: { since: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const ms = Date.now() - new Date(since).getTime();
  return (
    <span className="text-xs font-mono text-orange-700 font-semibold">
      {formatDuration(ms)} unresponded
    </span>
  );
}

function ResponseStatsCard({ projectId }: { projectId?: string | null }) {
  const { data } = useInboundLeadResponseStats(projectId);
  if (!data || data.all.total === 0) return null;
  const fmtAvg = (ms: number | null) =>
    ms === null ? "—" : formatDuration(ms);
  return (
    <Card>
      <CardContent className="p-3 flex flex-wrap gap-4 text-xs">
        <div>
          <div className="text-muted-foreground">Avg first response (all)</div>
          <div className="font-mono text-sm font-semibold">{fmtAvg(data.all.avgMs)}</div>
          <div className="text-[10px] text-muted-foreground">
            {data.all.responded}/{data.all.total} responded
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg first response (emergency)</div>
          <div className="font-mono text-sm font-semibold text-orange-700">
            {fmtAvg(data.emergency.avgMs)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {data.emergency.responded}/{data.emergency.total} responded
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InboundLeadsPanel() {
  const [status, setStatus] = useState<InboundLeadStatus>("new");
  const leads = useInboundLeads(status);
  const m = useInboundLeadMutations();
  const proposalM = useLeadProposal();
  const [bridge, setBridge] = useState<{
    open: boolean;
    proposal: ProjectSetupProposal | null;
    sourceLeadId: string | null;
    loadingId: string | null;
  }>({ open: false, proposal: null, sourceLeadId: null, loadingId: null });
  const [wizardVenueId, setWizardVenueId] = useState<string | null>(null);

  const startCreateFromLead = async (leadId: string) => {
    setBridge((b) => ({ ...b, loadingId: leadId }));
    try {
      const proposal = await proposalM.mutateAsync(leadId);
      setBridge({ open: true, proposal, sourceLeadId: leadId, loadingId: null });
    } catch (e: any) {
      setBridge((b) => ({ ...b, loadingId: null }));
      toast.error(e?.message ?? "Could not build proposal");
    }
  };

  // Emergency leads pin to the top regardless of created_at order.
  const sortedLeads: InboundLead[] = [...(leads.data ?? [])].sort((a, b) => {
    const aE = a.urgency_class === "emergency" && !a.first_response_at;
    const bE = b.urgency_class === "emergency" && !b.first_response_at;
    if (aE !== bE) return aE ? -1 : 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      <HelpTip helpKey={HELP_KEYS.crmInbound} title="What lands here">
        Three sources land here: the public marketing site form, the Lead Qualifier at <code>/qualify/&lt;vertical&gt;</code> (voice/chat/form), and manual inserts. Each row carries the channel, the structured answers, and the transcript when there is one. Promote real opportunities into the CRM flow; archive noise; the protection dialog handles hard deletes.
      </HelpTip>
      <ResponseStatsCard />
      <Tabs value={status} onValueChange={(v) => setStatus(v as InboundLeadStatus)}>
        <TabsList>
          <TabsTrigger value="new">New {leads.data?.length ? <Badge className="ml-2">{leads.data.length}</Badge> : null}</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="promoted">Promoted</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-3 space-y-2">
          {sortedLeads.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 text-center">
              {status === "new" ? "No new inbound leads." : "Nothing here."}
            </div>
          )}
          {sortedLeads.map((lead) => {
            const isEmergency = lead.urgency_class === "emergency";
            const showTimer = isEmergency && lead.urgency_captured_at && !lead.first_response_at;
            const canMarkResponded =
              !!lead.urgency_captured_at && !lead.first_response_at;
            return (
            <Card key={lead.id} className={cn(isEmergency && !lead.first_response_at && "border-l-4 border-l-orange-700")}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      <Inbox className="h-4 w-4 text-primary" />
                      <span>{lead.name}</span>
                      {lead.business_name && (
                        <span className="text-xs text-muted-foreground">· {lead.business_name}</span>
                      )}
                      {lead.project_type && (
                        <Badge variant="secondary" className="text-[10px]">{lead.project_type}</Badge>
                      )}
                      {lead.urgency_class && <UrgencyBadge cls={lead.urgency_class} />}
                      {lead.is_ready && (
                        <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Ready</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {lead.email} · {new Date(lead.created_at).toLocaleString()}
                      {showTimer && <EmergencyTimer since={lead.urgency_captured_at!} />}
                      {lead.first_response_at && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Responded {new Date(lead.first_response_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">{lead.status}</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{lead.message}</p>

                {canMarkResponded && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant={isEmergency ? "default" : "outline"}
                      className={cn(isEmergency && "bg-orange-700 hover:bg-orange-800")}
                      onClick={() => m.markResponded.mutate(lead.id)}
                      disabled={m.markResponded.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark responded
                    </Button>
                  </div>
                )}

                {(lead.status === "new" || lead.status === "reviewed") && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={bridge.loadingId === lead.id}
                      onClick={() => startCreateFromLead(lead.id)}
                    >
                      {bridge.loadingId === lead.id
                        ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        : <Building2 className="h-4 w-4 mr-1" />}
                      Create project from lead
                    </Button>
                    {lead.status === "new" && <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await m.promote.mutateAsync(lead);
                          toast.success("Promoted to CRM");
                        } catch (e: any) {
                          toast.error(e.message ?? "Promote failed");
                        }
                      }}
                    >
                      <ArrowRightCircle className="h-4 w-4 mr-1" /> Promote to CRM
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => m.markReviewed.mutate(lead.id)}>
                      <Eye className="h-4 w-4 mr-1" /> Mark reviewed
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => m.archive.mutate(lead.id)}>
                      <Archive className="h-4 w-4 mr-1" /> Archive
                    </Button>
                    </>}
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <EditBarDialog
        open={bridge.open}
        onOpenChange={(o) => setBridge((b) => ({ ...b, open: o, proposal: o ? b.proposal : null, sourceLeadId: o ? b.sourceLeadId : null }))}
        editingBar={null}
        initialProposal={bridge.proposal}
        sourceLeadId={bridge.sourceLeadId}
        onSaved={(newVenueId) => {
          leads.refetch();
          if (newVenueId) {
            toast.success("Project created — opening setup wizard");
            setWizardVenueId(newVenueId);
          }
        }}
      />

      {wizardVenueId && (
        <VenueOnboardingWizard
          open={!!wizardVenueId}
          onOpenChange={(o) => { if (!o) setWizardVenueId(null); }}
          venueId={wizardVenueId}
        />
      )}
    </div>
  );
}