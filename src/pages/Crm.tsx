import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { CollectionToolbar } from "@/components/shared/CollectionToolbar";
import { sortCollection, compareName } from "@/lib/collectionSort";

export default function Crm() {
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(window.location.search).get("company"));
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ["pipeline", "companies", "contacts", "followups", "inbound"] as const;
  const initialTab = (validTabs as readonly string[]).includes(searchParams.get("tab") ?? "")
    ? (searchParams.get("tab") as string)
    : "pipeline";
  const [tab, setTab] = useState<string>(initialTab);
  const chooseTab = (value: string) => {
    setTab(value);
    const next = new URLSearchParams(searchParams);
    if (value === 'pipeline') next.delete('tab'); else next.set('tab', value);
    setSearchParams(next, { replace: true });
  };
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
  const [companyQuery, setCompanyQuery] = useState('');
  const [companySort, setCompanySort] = useState('name');
  const [contactQuery, setContactQuery] = useState('');
  const companyRows = sortCollection((companies.data ?? []).filter(c => `${c.name} ${c.industry ?? ''}`.toLowerCase().includes(companyQuery.trim().toLowerCase()))
    .map(c => ({...c, title: c.name})), companySort);
  const contactRows = (contacts.data ?? []).filter(c => `${c.first_name ?? ''} ${c.last_name ?? ''} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(contactQuery.trim().toLowerCase()))
    .sort((a, b) => compareName(`${a.first_name ?? ''} ${a.last_name ?? ''}`, `${b.first_name ?? ''} ${b.last_name ?? ''}`));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-sm text-muted-foreground">All accessible companies · deals, contacts, and follow-ups</p>
        </div>
        <Button className="ml-auto" onClick={() => { chooseTab('companies'); setTimeout(() => document.getElementById('new-crm-company')?.focus(), 0); }}><Plus className="h-4 w-4" />Add company</Button>
      </header>

      <HelpTip helpKey={HELP_KEYS.crmPipeline} title="How the pipeline works">
        Move deals through Lead, Pitch, Proposal, and Won or Lost. When a deal is won, turn the company into an active project. Archive keeps its history; the delete dialog lists everything affected before you confirm.
      </HelpTip>

      <HelpTip helpKey={HELP_KEYS.crmFulfillment} title="Where the CRM fits in the fulfillment flow">
        Qualifier → Inbound Leads → promote into a CRM company + deal → Won → graduate to a project
        → apply an Automation Bundle → AI drafts go to the Automation Inbox → Recovery Report shows
        what was recovered. See the Help Center article "The fulfillment flow" for the full map.
      </HelpTip>

      <Tabs value={tab} onValueChange={chooseTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start no-scrollbar">
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
          <CollectionToolbar query={companyQuery} onQuery={setCompanyQuery} placeholder="Find a company or industry…"
            sort={companySort} onSort={setCompanySort} count={companyRows.length} total={companies.data?.length ?? 0}
            options={[{value:'name',label:'Name · A to Z'},{value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'}]} />
          <div className="flex gap-2">
            <Input id="new-crm-company" aria-label="New company name" placeholder="New company name…" value={newCompanyName}
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
            {companyRows.map((c) => (
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
            {companyRows.length === 0 && (
              <div className="text-sm text-muted-foreground p-4 text-center md:col-span-2">
                {companyQuery ? 'No companies match your search.' : showArchivedCompanies ? "No archived companies." : "No companies yet."}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-2">
          <Label htmlFor="crm-contact-search">Find a contact · A to Z</Label>
          <Input id="crm-contact-search" value={contactQuery} onChange={e => setContactQuery(e.target.value)} placeholder="Name, email, or phone…" />
          {contactRows.length === 0 && <p className="p-4 text-muted-foreground">No contacts match.</p>}
          {contactRows.map((c) => (
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
                    <Button size="sm" disabled={m.completeFollowUp.isPending} onClick={e => {
                      e.stopPropagation(); m.completeFollowUp.mutate(i.id, {onError:error => toast.error(error.message)});
                    }}>Complete follow-up</Button>
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
