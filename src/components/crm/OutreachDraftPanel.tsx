import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Copy, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  CHANNEL_LABELS, OutreachChannel, OutreachDraft, OutreachSequenceStep,
  useDeleteOutreachDraft, useGenerateOutreach, useOutreachDrafts, useUpdateOutreachDraft,
} from "@/hooks/useOutreachDrafts";
import { LeadAnalysis } from "@/hooks/useLeadAnalyses";

const DEFAULT_DAYS = [1, 3, 7, 14, 30];

export function OutreachDraftPanel({ companyId, analysis }: {
  companyId: string;
  analysis: LeadAnalysis | null;
}) {
  const draftsQ = useOutreachDrafts(companyId);
  const generate = useGenerateOutreach();

  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<OutreachChannel>("cold_email");
  const [tone, setTone] = useState("professional, direct, friendly");
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const [newDay, setNewDay] = useState("");

  const addDay = () => {
    const n = Number(newDay);
    if (!Number.isInteger(n) || n < 0 || n > 365) return;
    if (days.includes(n)) return;
    setDays([...days, n].sort((a, b) => a - b));
    setNewDay("");
  };

  const run = async () => {
    if (!analysis) return;
    try {
      await generate.mutateAsync({
        analysis_id: analysis.id,
        company_id: companyId,
        channel,
        tone,
        sequence_days: days,
      });
      toast.success("Outreach drafted");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate");
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Outreach Drafts</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} disabled={!analysis}>
          <Send className="h-4 w-4 mr-1" /> {open ? "Cancel" : "Generate Outreach"}
        </Button>
      </div>
      {!analysis && (
        <div className="text-xs text-muted-foreground">Run a lead analysis first to draft outreach.</div>
      )}

      {open && analysis && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as OutreachChannel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CHANNEL_LABELS) as OutreachChannel[]).map((c) => (
                      <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tone</Label>
                <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="professional, direct…" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Follow-up days</Label>
              <div className="flex gap-1 flex-wrap items-center mt-1">
                {days.map((d) => (
                  <Badge key={d} variant="outline" className="gap-1">
                    Day {d}
                    <button type="button" onClick={() => setDays(days.filter((x) => x !== d))} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <div className="flex gap-1 items-center">
                  <Input
                    type="number" value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDay(); } }}
                    placeholder="day" className="h-7 w-16 text-xs"
                  />
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={addDay}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={run} disabled={generate.isPending || days.length === 0}>
                {generate.isPending ? "Generating…" : "Draft outreach"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {draftsQ.isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : (draftsQ.data ?? []).length === 0 ? (
        <div className="text-xs text-muted-foreground">No drafts yet.</div>
      ) : (
        <div className="space-y-3">
          {(draftsQ.data ?? []).map((d) => (
            <DraftCard key={d.id} draft={d} companyId={companyId} />
          ))}
        </div>
      )}
    </section>
  );
}

function DraftCard({ draft, companyId }: { draft: OutreachDraft; companyId: string }) {
  const update = useUpdateOutreachDraft();
  const remove = useDeleteOutreachDraft();
  const [opener, setOpener] = useState(draft.opener ?? "");
  const [sequence, setSequence] = useState<OutreachSequenceStep[]>(draft.sequence ?? []);
  const [dirty, setDirty] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch { toast.error("Copy failed"); }
  };

  const save = async () => {
    try {
      await update.mutateAsync({ id: draft.id, companyId, patch: { opener, sequence } });
      toast.success("Saved");
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this draft?")) return;
    try {
      await remove.mutateAsync({ id: draft.id, companyId });
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">{CHANNEL_LABELS[draft.channel]}</Badge>
          {draft.tone && <Badge variant="outline">{draft.tone}</Badge>}
          <span className="text-xs text-muted-foreground ml-auto">{new Date(draft.created_at).toLocaleString()}</span>
          <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Opener</Label>
            <Button size="icon" variant="ghost" onClick={() => copy(opener)}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
          <Textarea rows={3} value={opener} onChange={(e) => { setOpener(e.target.value); setDirty(true); }} />
        </div>

        {sequence.map((s, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Day {s.day}{s.label ? ` — ${s.label}` : ""}</Label>
              <Button size="icon" variant="ghost" onClick={() => copy(s.body)}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            <Textarea rows={3} value={s.body}
              onChange={(e) => {
                const next = [...sequence];
                next[idx] = { ...s, body: e.target.value };
                setSequence(next);
                setDirty(true);
              }}
            />
          </div>
        ))}

        {dirty && (
          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}