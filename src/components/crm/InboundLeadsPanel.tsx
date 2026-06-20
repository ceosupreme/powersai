import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, ArrowRightCircle, Archive, Eye, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useInboundLeads, useInboundLeadMutations,
  type InboundLeadStatus,
} from "@/hooks/useInboundLeads";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";
import { useLeadProposal, type ProjectSetupProposal } from "@/hooks/useLeadProposal";
import { EditBarDialog } from "@/components/admin/EditBarDialog";
import { VenueOnboardingWizard } from "@/components/onboarding/VenueOnboardingWizard";

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

  return (
    <div className="space-y-3">
      <HelpTip helpKey={HELP_KEYS.crmInbound} title="What lands here">
        Three sources land here: the public marketing site form, the Lead Qualifier at <code>/qualify/&lt;vertical&gt;</code> (voice/chat/form), and manual inserts. Each row carries the channel, the structured answers, and the transcript when there is one. Promote real opportunities into the CRM flow; archive noise; the protection dialog handles hard deletes.
      </HelpTip>
      <Tabs value={status} onValueChange={(v) => setStatus(v as InboundLeadStatus)}>
        <TabsList>
          <TabsTrigger value="new">New {leads.data?.length ? <Badge className="ml-2">{leads.data.length}</Badge> : null}</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="promoted">Promoted</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-3 space-y-2">
          {(leads.data ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground p-4 text-center">
              {status === "new" ? "No new inbound leads." : "Nothing here."}
            </div>
          )}
          {(leads.data ?? []).map((lead) => (
            <Card key={lead.id}>
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
                      {lead.is_ready && (
                        <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Ready</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lead.email} · {new Date(lead.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline">{lead.status}</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{lead.message}</p>

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
          ))}
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