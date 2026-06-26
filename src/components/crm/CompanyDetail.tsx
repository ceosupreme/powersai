import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Plus, Sparkles, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCompany, useContacts, useDeals, useInteractions, useCrmMutations, useCompanyLinkCounts,
  type CrmInteractionType,
} from "@/hooks/useCrm";
import { useApp } from "@/context/AppContext";
import { ArchiveOrDeleteDialog, type LinkedLine } from "@/components/shared/ArchiveOrDeleteDialog";
import { SuggestionsPanel } from "@/components/help/SuggestionsPanel";
import { LeadAnalysisPanel } from "@/components/crm/LeadAnalysisPanel";
import { OutreachDraftPanel } from "@/components/crm/OutreachDraftPanel";
import type { LeadAnalysis } from "@/hooks/useLeadAnalyses";
import { useServicePackages } from "@/hooks/useServicePackages";

export function CompanyDetail({ companyId, onOpenChange }: {
  companyId: string | null; onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { accessibleBars, setSelectedBar } = useApp();
  const companyQ = useCompany(companyId);
  const contactsQ = useContacts(companyId ?? null);
  const dealsQ = useDeals();
  const interactionsQ = useInteractions(companyId);
  const m = useCrmMutations();
  const linkCounts = useCompanyLinkCounts(companyId);
  const [delOpen, setDelOpen] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<LeadAnalysis | null>(null);

  const company = companyQ.data;
  const deals = (dealsQ.data ?? []).filter((d) => d.company_id === companyId);
  const hasWonDeal = deals.some((d) => d.stage === "won");

  const [intType, setIntType] = useState<CrmInteractionType>("note");
  const [intSummary, setIntSummary] = useState("");
  const [intFollow, setIntFollow] = useState("");

  const [newContact, setNewContact] = useState({ first_name: "", last_name: "", email: "" });
  const [newDeal, setNewDeal] = useState<{ title: string; value: string; package_id: string }>(
    { title: "", value: "", package_id: "" },
  );
  const { data: catalogPackages = [] } = useServicePackages({ activeOnly: true });
  const packageNameById = (id: string | null) =>
    id ? (catalogPackages.find((p) => p.id === id)?.name ?? null) : null;

  const graduate = async () => {
    if (!company) return;
    try {
      const venueId = await m.graduateCompany.mutateAsync(company);
      toast.success("Project created");
      const bar = accessibleBars.find((b) => b.id === venueId);
      if (bar) setSelectedBar(bar);
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const viewProject = () => {
    if (!company?.linked_project_id) return;
    const bar = accessibleBars.find((b) => b.id === company.linked_project_id);
    if (bar) setSelectedBar(bar);
    navigate("/dashboard");
  };

  return (
    <Sheet open={!!companyId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {!company ? <div className="p-4 text-muted-foreground">Loading…</div> : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {company.name}
                <Badge variant="outline">{company.status}</Badge>
                {company.archived && <Badge variant="outline">archived</Badge>}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <SuggestionsPanel
                title="Suggestions for this company"
                hideWhenEmpty
                filter={(s) => s.scope?.kind === "company" && s.scope.id === company.id}
              />

              {company.linked_project_id ? (
                <Button onClick={viewProject} variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" /> View Project
                </Button>
              ) : hasWonDeal ? (
                <Button onClick={graduate} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" /> Create Project from this Company
                </Button>
              ) : null}

              <div className="flex gap-2">
                {company.archived ? (
                  <Button variant="outline" size="sm" className="flex-1"
                    onClick={async () => {
                      await m.restoreCompany.mutateAsync(company.id);
                      toast.success("Restored");
                    }}>
                    <ArchiveRestore className="h-4 w-4 mr-1" /> Restore
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setDelOpen(true)}>
                    <Archive className="h-4 w-4 mr-1" /> Archive or delete…
                  </Button>
                )}
                {company.archived && (
                  <Button variant="destructive" size="sm" onClick={() => setDelOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete…
                  </Button>
                )}
              </div>

              <ArchiveOrDeleteDialog
                open={delOpen}
                onOpenChange={setDelOpen}
                entityLabel="company"
                entityName={company.name}
                allowArchive={!company.archived}
                linkedLines={(() => {
                  const lc = linkCounts.data;
                  if (!lc) return [];
                  const lines: LinkedLine[] = [];
                  if (lc.deals)        lines.push({ count: lc.deals,        label: lc.deals === 1 ? 'deal' : 'deals', effect: 'destroyed' });
                  if (lc.interactions) lines.push({ count: lc.interactions, label: lc.interactions === 1 ? 'interaction' : 'interactions', effect: 'destroyed' });
                  if (lc.contacts)     lines.push({ count: lc.contacts,     label: lc.contacts === 1 ? 'contact' : 'contacts', effect: 'unlinked' });
                  return lines;
                })()}
                onArchive={async (reason) => {
                  await m.archiveCompany.mutateAsync({ id: company.id, reason });
                  toast.success("Archived");
                  onOpenChange(false);
                }}
                onDelete={async () => {
                  await m.deleteCompany.mutateAsync(company.id);
                  toast.success("Deleted");
                  onOpenChange(false);
                }}
              />

              <Card>
                <CardContent className="p-3 text-sm space-y-1">
                  <div><span className="text-muted-foreground">Website: </span>{company.website || "—"}</div>
                  <div><span className="text-muted-foreground">Industry: </span>{company.industry || "—"}</div>
                  {company.notes && <div className="text-muted-foreground whitespace-pre-wrap">{company.notes}</div>}
                </CardContent>
              </Card>

              {/* Contacts */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Contacts</h3>
                {(contactsQ.data ?? []).map((c) => (
                  <div key={c.id} className="text-sm border rounded p-2">
                    {c.first_name} {c.last_name} {c.email && <span className="text-muted-foreground">· {c.email}</span>}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="First" value={newContact.first_name}
                    onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })} />
                  <Input placeholder="Last" value={newContact.last_name}
                    onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })} />
                  <Input placeholder="Email" value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                  <Button size="icon" variant="outline" onClick={async () => {
                    if (!newContact.first_name && !newContact.email) return;
                    await m.createContact.mutateAsync({ ...newContact, company_id: company.id });
                    setNewContact({ first_name: "", last_name: "", email: "" });
                  }}><Plus className="h-4 w-4" /></Button>
                </div>
              </section>

              {/* Deals */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Deals</h3>
                {deals.map((d) => (
                  <div key={d.id} className="text-sm border rounded p-2 flex items-center justify-between">
                    <span>
                      {d.title}
                      {d.value ? ` · $${Number(d.value).toLocaleString()}` : ""}
                      {packageNameById(d.package_id) && (
                        <span className="text-muted-foreground"> · {packageNameById(d.package_id)}</span>
                      )}
                    </span>
                    <Badge variant="outline">{d.stage}</Badge>
                  </div>
                ))}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Deal title"
                      value={newDeal.title}
                      onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Value"
                      className="w-32"
                      value={newDeal.value}
                      onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={async () => {
                        if (!newDeal.title) return;
                        await m.createDeal.mutateAsync({
                          company_id: company.id,
                          title: newDeal.title,
                          value: newDeal.value ? Number(newDeal.value) : (null as any),
                          package_id: newDeal.package_id ? (newDeal.package_id as any) : (null as any),
                        });
                        setNewDeal({ title: "", value: "", package_id: "" });
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select
                    value={newDeal.package_id || "__none"}
                    onValueChange={(v) => {
                      if (v === "__none") {
                        setNewDeal({ ...newDeal, package_id: "" });
                        return;
                      }
                      const pkg = catalogPackages.find((p) => p.id === v);
                      setNewDeal({
                        ...newDeal,
                        package_id: v,
                        // Pre-fill value from package one_time_price if value is empty.
                        value: newDeal.value === "" && pkg ? String(pkg.one_time_price ?? "") : newDeal.value,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Package (optional) — names what's being sold" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No package</SelectItem>
                      {catalogPackages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.tier ? `${p.tier} · ` : ""}{p.name}
                          {p.one_time_price ? ` — $${p.one_time_price}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* Interactions */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Log Interaction</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={intType} onValueChange={(v) => setIntType(v as CrmInteractionType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["note","call","email","meeting"] as const).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={intFollow} onChange={(e) => setIntFollow(e.target.value)}
                    placeholder="Follow-up date" />
                </div>
                <Textarea rows={2} placeholder="Summary…" value={intSummary}
                  onChange={(e) => setIntSummary(e.target.value)} />
                <Button size="sm" onClick={async () => {
                  if (!intSummary.trim()) return;
                  await m.logInteraction.mutateAsync({
                    company_id: company.id, type: intType, summary: intSummary,
                    follow_up_date: intFollow || null,
                  });
                  setIntSummary(""); setIntFollow("");
                }}>Log</Button>

                <h3 className="text-sm font-semibold pt-2">Timeline</h3>
                {(interactionsQ.data ?? []).map((i) => (
                  <div key={i.id} className="text-sm border rounded p-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{i.type}</Badge>
                      <span>{new Date(i.occurred_at).toLocaleString()}</span>
                      {i.follow_up_date && <span>· follow up {i.follow_up_date}</span>}
                    </div>
                    {i.summary && <div className="mt-1 whitespace-pre-wrap">{i.summary}</div>}
                  </div>
                ))}
              </section>

              {/* Client Acquisition: AI lead analysis + outreach drafts */}
              <LeadAnalysisPanel
                companyId={company.id}
                defaultWebsite={company.website}
                onAnalysisChange={setLatestAnalysis}
              />
              <OutreachDraftPanel companyId={company.id} analysis={latestAnalysis} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}