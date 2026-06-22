import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useCustomerLists,
  useCustomerListMembers,
  useCreateCustomerList,
  useImportCustomerListMembers,
  useStartReactivation,
} from "@/hooks/useCustomerLists";
import { useAutomationEnrollments } from "@/hooks/useAutomationEnrollments";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

export default function ReactivationCampaigns() {
  const { selectedBar } = useApp();
  const projectId = selectedBar?.id ?? null;
  const { data: lists = [] } = useCustomerLists(projectId);
  const { data: enrollments = [] } = useAutomationEnrollments(projectId);
  const enrolled = enrollments.find((e) => e.automation_key === "reactivation")?.enabled;
  const createList = useCreateCustomerList();
  const importMembers = useImportCustomerListMembers();
  const start = useStartReactivation();

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [csv, setCsv] = useState("");
  const [offer, setOffer] = useState("");
  const [campaignName, setCampaignName] = useState("");

  const { data: members = [] } = useCustomerListMembers(selectedListId);

  const counts = useMemo(() => members.length, [members]);

  if (!projectId) {
    return <div className="p-6 text-sm text-muted-foreground">Select a project to manage reactivation lists.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Reactivation</h1>
        <p className="text-sm text-muted-foreground">
          Upload an old customer list, AI segments + drafts a win-back, you approve in the Automation Inbox.
        </p>
      </div>

      <HelpTip helpKey={HELP_KEYS.reactivation} title="How a reactivation campaign works">
        Create a list → import members (CSV: name, email, phone, last_visit_at) → start a campaign
        with an offer → AI drafts one message per member → drafts land in the Automation Inbox for
        your approval. Nothing sends until you approve it.
      </HelpTip>

      {!enrolled && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5 text-sm">
          Reactivation is not enabled for this project. Turn it on in the project's automations panel.
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <h2 className="font-medium">Lists</h2>
        <div className="flex flex-wrap gap-2">
          {lists.length === 0 && <p className="text-xs text-muted-foreground">No lists yet.</p>}
          {lists.map((l) => (
            <Button
              key={l.id}
              size="sm"
              variant={selectedListId === l.id ? "default" : "outline"}
              onClick={() => setSelectedListId(l.id)}
            >{l.name}</Button>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Input placeholder="New list name" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
          <Button size="sm" disabled={!newListName.trim() || createList.isPending} onClick={async () => {
            try {
              const l = await createList.mutateAsync({ project_id: projectId, name: newListName.trim(), source: "manual" });
              setSelectedListId(l.id); setNewListName(""); toast.success("List created");
            } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
          }}>Create list</Button>
        </div>
      </Card>

      {selectedListId && (
        <>
          <Card className="p-4 space-y-3">
            <h2 className="font-medium">Import members ({counts} in list)</h2>
            <Label className="text-xs">Paste CSV: name,email,phone,last_visit_at (ISO)</Label>
            <Textarea rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-xs" />
            <div className="flex justify-end">
              <Button size="sm" disabled={!csv.trim() || importMembers.isPending} onClick={async () => {
                const lines = csv.trim().split(/\r?\n/).filter(Boolean);
                const rows = lines.map((line) => {
                  const [name, email, phone, last_visit_at] = line.split(",").map((s) => s.trim());
                  return { name, email, phone, last_visit_at };
                });
                try {
                  const n = await importMembers.mutateAsync({ list_id: selectedListId, project_id: projectId, members: rows });
                  toast.success(`Imported ${n}`); setCsv("");
                } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
              }}>Import</Button>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-medium">Start campaign</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Campaign name</Label>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Offer</Label>
                <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="e.g. 20% off your next visit" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button disabled={!enrolled || counts === 0 || start.isPending} onClick={async () => {
                try {
                  const r = await start.mutateAsync({ list_id: selectedListId, name: campaignName || undefined, offer: offer || undefined, channel: "email" });
                  toast.success(`Queued ${r?.queued ?? 0} drafts — approve in Automation Inbox`);
                } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
              }}>Draft campaign</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}