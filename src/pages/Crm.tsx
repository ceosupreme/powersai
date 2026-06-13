import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Briefcase, Inbox, MoreVertical, ArchiveRestore } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import { CompanyDetail } from "@/components/crm/CompanyDetail";
import { InboundLeadsPanel } from "@/components/crm/InboundLeadsPanel";
import { useInboundLeads } from "@/hooks/useInboundLeads";
import {
  useCompanies, useContacts, useFollowUpsDue, useCrmMutations, useCompanyLinkCounts,
  type CrmCompany,
} from "@/hooks/useCrm";
import { ArchiveOrDeleteDialog, type LinkedLine } from "@/components/shared/ArchiveOrDeleteDialog";
import { todayPacific } from "@/lib/utils";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

export default function Crm() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showArchivedCompanies, setShowArchivedCompanies] = useState(false);
  const companies = useCompanies({ onlyArchived: showArchivedCompanies });
  const contacts = useContacts();
  const followups = useFollowUpsDue();
  const inboundNew = useInboundLeads("new");
  const m = useCrmMutations();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [target, setTarget] = useState<CrmCompany | null>(null);
  const linkCounts = useCompanyLinkCounts(target?.id ?? null);
  const today = todayPacific();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 space-y-6">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-sm text-muted-foreground">Pipeline, contacts, and follow-ups</p>
        </div>
      </header>

      <HelpTip helpKey={HELP_KEYS.crmPipeline} title="How the pipeline works">
        Deals flow Lead → Pitch → Proposal → Won/Lost. When a deal hits Won, graduate the company into an active project so you can operate against it. Archive keeps history; delete cascades — the dialog will tell you exactly what dies and what gets orphaned.
      </HelpTip>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="followups">
            Follow-ups {followups.data?.length ? <Badge className="ml-2">{followups.data.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="inbound">
            <Inbox className="h-3.5 w-3.5 mr-1" />
            Inbound {inboundNew.data?.length ? <Badge className="ml-2">{inboundNew.data.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineBoard onSelectCompany={setSelected} />
        </TabsContent>

        <TabsContent value="companies" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New company name…" value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)} />
            <Button onClick={async () => {
              if (!newCompanyName.trim()) return;
              await m.createCompany.mutateAsync({ name: newCompanyName.trim() });
              setNewCompanyName("");
            }}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch id="archived-companies" checked={showArchivedCompanies}
              onCheckedChange={setShowArchivedCompanies} />
            <Label htmlFor="archived-companies" className="cursor-pointer">Show archived</Label>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {(companies.data ?? []).map((c) => (
              <Card key={c.id} className="cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between gap-2"
                  onClick={() => setSelected(c.id)}>
                  <div>
                    <div className="font-medium">{c.name}</div>
                    {c.website && <div className="text-xs text-muted-foreground">{c.website}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.status}</Badge>
                    {c.linked_project_id && <Badge>linked</Badge>}
                    {c.archived && <Badge variant="outline">archived</Badge>}
                    <div onClick={(e) => e.stopPropagation()}>
                      {c.archived ? (
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => m.restoreCompany.mutate(c.id, {
                            onSuccess: () => toast.success(`Restored "${c.name}"`),
                          })}>
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTarget(c)}>
                              Archive or delete…
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(companies.data ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground p-4 text-center md:col-span-2">
                {showArchivedCompanies ? "No archived companies." : "No companies yet."}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-2">
          {(contacts.data ?? []).map((c) => (
            <Card key={c.id}>
              <CardContent className="p-3 text-sm">
                <div className="font-medium">{c.first_name} {c.last_name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.email || "—"} {c.phone ? `· ${c.phone}` : ""} {c.title ? `· ${c.title}` : ""}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Follow-ups Due</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(followups.data ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">Nothing due. Good work.</div>
              )}
              {(followups.data ?? []).map((i) => {
                const overdue = i.follow_up_date && i.follow_up_date < today;
                return (
                  <div key={i.id} className="text-sm border rounded p-2 flex items-center justify-between cursor-pointer"
                    onClick={() => setSelected(i.company_id)}>
                    <div>
                      <Badge variant={overdue ? "destructive" : "outline"} className="mr-2">{i.follow_up_date}</Badge>
                      {i.summary || i.type}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbound" className="mt-4">
          <InboundLeadsPanel />
        </TabsContent>
      </Tabs>

      <CompanyDetail companyId={selected} onOpenChange={(o) => !o && setSelected(null)} />

      {target && (
        <ArchiveOrDeleteDialog
          open={!!target}
          onOpenChange={(o) => { if (!o) setTarget(null); }}
          entityLabel="company"
          entityName={target.name}
          linkedLines={(() => {
            const lc = linkCounts.data;
            if (!lc) return [];
            const lines: LinkedLine[] = [];
            // ON DELETE CASCADE
            if (lc.deals)        lines.push({ count: lc.deals,        label: lc.deals === 1 ? 'deal' : 'deals', effect: 'destroyed' });
            if (lc.interactions) lines.push({ count: lc.interactions, label: lc.interactions === 1 ? 'interaction' : 'interactions', effect: 'destroyed' });
            // ON DELETE SET NULL
            if (lc.contacts)     lines.push({ count: lc.contacts,     label: lc.contacts === 1 ? 'contact' : 'contacts', effect: 'unlinked' });
            return lines;
          })()}
          onArchive={async (reason) => {
            await m.archiveCompany.mutateAsync({ id: target.id, reason });
            toast.success(`Archived "${target.name}"`);
          }}
          onDelete={async () => {
            await m.deleteCompany.mutateAsync(target.id);
            toast.success(`Deleted "${target.name}"`);
          }}
        />
      )}
    </div>
  );
}