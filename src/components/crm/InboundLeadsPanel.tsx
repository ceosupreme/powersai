import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, ArrowRightCircle, Archive, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  useInboundLeads, useInboundLeadMutations,
  type InboundLeadStatus,
} from "@/hooks/useInboundLeads";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

export function InboundLeadsPanel() {
  const [status, setStatus] = useState<InboundLeadStatus>("new");
  const leads = useInboundLeads(status);
  const m = useInboundLeadMutations();

  return (
    <div className="space-y-3">
      <HelpTip helpKey={HELP_KEYS.crmInbound} title="What lands here">
        Submissions from the public marketing site write to <code>inbound_leads</code> (admin-only). Triage by archiving noise, promoting real opportunities into the regular CRM flow, or hard-deleting via the protection dialog.
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
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lead.email} · {new Date(lead.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline">{lead.status}</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap">{lead.message}</p>

                {lead.status === "new" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
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
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}