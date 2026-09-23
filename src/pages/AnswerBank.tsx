import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, HelpCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { useBrandProjects } from "@/hooks/useContentProduction";

const T = (n: string) => supabase.from(n as any) as any;
const STATUSES = ["unanswered", "answered", "refresh_due"] as const;
const STATUS_LABELS: Record<string, string> = {
  unanswered: "Unanswered", answered: "Answered", refresh_due: "Refresh due",
};
const REASONS = ["money", "safety", "time", "embarrassment", "frustration"];

interface Pain {
  id: string; project_id: string; pain_text: string; pillar: string | null;
  source_links: string[]; source_count: number; first_seen: string | null; last_seen: string | null;
  intensity: number | null; intensity_reasons: string[]; search_presence: number | null;
  gap: number | null; pain_score: number | null; status: string; answered_by: string[];
  product_flag: boolean; notes: string | null;
}

const empty = {
  pain_text: "", pillar: "", source_links: "", source_count: "0", first_seen: "", last_seen: "",
  intensity: "", intensity_reasons: [] as string[], search_presence: "", gap: "", pain_score: "",
  status: "unanswered", product_flag: false, notes: "",
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export default function AnswerBank() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: projects = [] } = useBrandProjects();
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("all");
  const [pillar, setPillar] = useState("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Pain | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => { if (!brand && projects.length) setBrand(projects[0].id); }, [projects, brand]);

  const pains = useQuery({
    queryKey: ["audience-pains", brand],
    enabled: !!brand && isAdmin,
    queryFn: async (): Promise<Pain[]> => {
      const { data, error } = await T("audience_pains").select("*").eq("project_id", brand)
        .order("pain_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const answeredIds = useMemo(
    () => [...new Set((pains.data ?? []).flatMap((p) => p.answered_by ?? []))],
    [pains.data],
  );
  const pieces = useQuery({
    queryKey: ["answer-bank-pieces", answeredIds.join(",")],
    enabled: answeredIds.length > 0,
    queryFn: async () => {
      const { data, error } = await T("content_items").select("id,title,stage").in("id", answeredIds);
      if (error) throw error;
      return new Map<string, { title: string; stage: string }>((data ?? []).map((d: any) => [d.id, d]));
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        project_id: brand,
        pain_text: form.pain_text.trim(),
        pillar: form.pillar.trim() || null,
        source_links: form.source_links.split("\n").map((s) => s.trim()).filter(Boolean),
        source_count: Number(form.source_count || 0),
        first_seen: form.first_seen || null,
        last_seen: form.last_seen || null,
        intensity: num(form.intensity),
        intensity_reasons: form.intensity_reasons,
        search_presence: num(form.search_presence),
        gap: num(form.gap),
        pain_score: num(form.pain_score),
        status: form.status,
        product_flag: form.product_flag,
        notes: form.notes.trim() || null,
      };
      const { error } = editing
        ? await T("audience_pains").update(payload).eq("id", editing.id)
        : await T("audience_pains").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audience-pains"] });
      setDialogOpen(false);
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6">
        <Card className="bg-card text-card-foreground border-border">
          <CardContent className="p-6 text-sm text-muted-foreground">
            The Answer Bank is available to admins only.
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = (pains.data ?? []).filter((p) =>
    (status === "all" || p.status === status) && (pillar === "all" || p.pillar === pillar));
  const pillars = [...new Set((pains.data ?? []).map((p) => p.pillar).filter(Boolean))] as string[];

  const startAdd = () => { setEditing(null); setForm(empty); setDialogOpen(true); };
  const startEdit = (p: Pain) => {
    setEditing(p);
    setForm({
      pain_text: p.pain_text, pillar: p.pillar ?? "", source_links: (p.source_links ?? []).join("\n"),
      source_count: String(p.source_count ?? 0), first_seen: p.first_seen ?? "", last_seen: p.last_seen ?? "",
      intensity: p.intensity?.toString() ?? "", intensity_reasons: p.intensity_reasons ?? [],
      search_presence: p.search_presence?.toString() ?? "", gap: p.gap?.toString() ?? "",
      pain_score: p.pain_score?.toString() ?? "", status: p.status, product_flag: p.product_flag,
      notes: p.notes ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      <header className="flex flex-wrap items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <h1 className="text-2xl font-bold">Answer Bank</h1>
          <p className="text-sm text-muted-foreground">
            Your audience's pains and questions, in their words, ranked by how much they hurt.
          </p>
        </div>
        <Button onClick={startAdd} disabled={!brand}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={brand} onValueChange={(v) => { setBrand(v); setPillar("all"); }}>
          <SelectTrigger aria-label="Brand"><SelectValue placeholder="Pick a brand" /></SelectTrigger>
          <SelectContent>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={pillar} onValueChange={setPillar}>
          <SelectTrigger aria-label="Pillar"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any pillar</SelectItem>
            {pillars.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {pains.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="bg-card text-card-foreground border-border">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {projects.length === 0
              ? "No internal brand projects are switched on yet."
              : "Nothing here yet. Tap Add to record a pain or question your audience has, with links to where you saw it."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const isOpen = !!open[p.id];
            return (
              <Card key={p.id} className="bg-card text-card-foreground border-border">
                <CardContent className="p-4 space-y-2">
                  <button
                    className="w-full flex items-start gap-2 text-left"
                    onClick={() => setOpen({ ...open, [p.id]: !isOpen })}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 mt-1 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-1 shrink-0" />}
                    <span className="flex-1 font-medium leading-snug">{p.pain_text}</span>
                    <Badge variant="secondary" className="shrink-0">{p.pain_score ?? "—"}/25</Badge>
                  </button>
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    <Badge variant="outline" className="text-xs">{STATUS_LABELS[p.status] ?? p.status}</Badge>
                    {p.pillar && <Badge variant="outline" className="text-xs">{p.pillar}</Badge>}
                    {p.product_flag && <Badge className="text-xs">Product idea</Badge>}
                    <span className="text-xs text-muted-foreground self-center">
                      {p.source_count} sources
                    </span>
                  </div>
                  {isOpen && (
                    <div className="pl-6 space-y-3 text-sm">
                      <div className="text-xs text-muted-foreground">
                        Intensity {p.intensity ?? "—"} · search {p.search_presence ?? "—"} · gap {p.gap ?? "—"}
                        {p.intensity_reasons?.length ? ` · ${p.intensity_reasons.join(", ")}` : ""}
                        {p.first_seen ? ` · first seen ${p.first_seen}` : ""}
                        {p.last_seen ? ` · last seen ${p.last_seen}` : ""}
                      </div>
                      <div>
                        <div className="font-medium text-xs mb-1">Source links</div>
                        {p.source_links?.length ? (
                          <ul className="space-y-1">
                            {p.source_links.map((l) => (
                              <li key={l} className="break-all">
                                <a href={l} target="_blank" rel="noreferrer" className="text-primary underline">{l}</a>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-xs text-muted-foreground">No links yet.</p>}
                      </div>
                      <div>
                        <div className="font-medium text-xs mb-1">Answered by</div>
                        {p.answered_by?.length ? (
                          <ul className="space-y-1">
                            {p.answered_by.map((id) => {
                              const it = pieces.data?.get(id);
                              return <li key={id}>{it ? `${it.title} (${it.stage})` : "A piece that no longer exists"}</li>;
                            })}
                          </ul>
                        ) : <p className="text-xs text-muted-foreground">No pieces answer this yet.</p>}
                      </div>
                      {p.notes && <p className="text-muted-foreground whitespace-pre-wrap">{p.notes}</p>}
                      <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit entry" : "Add entry"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Pain or question (their words)</Label>
              <Textarea rows={3} value={form.pain_text} onChange={(e) => setForm({ ...form, pain_text: e.target.value })} /></div>
            <div><Label>Pillar</Label>
              <Input value={form.pillar} onChange={(e) => setForm({ ...form, pillar: e.target.value })} /></div>
            <div><Label>Source links (one per line)</Label>
              <Textarea rows={3} value={form.source_links} onChange={(e) => setForm({ ...form, source_links: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Source count</Label>
                <Input type="number" min={0} value={form.source_count} onChange={(e) => setForm({ ...form, source_count: e.target.value })} /></div>
              <div><Label>Pain score (0–25)</Label>
                <Input type="number" min={0} max={25} value={form.pain_score} onChange={(e) => setForm({ ...form, pain_score: e.target.value })} /></div>
              <div><Label>First seen</Label>
                <Input type="date" value={form.first_seen} onChange={(e) => setForm({ ...form, first_seen: e.target.value })} /></div>
              <div><Label>Last seen</Label>
                <Input type="date" value={form.last_seen} onChange={(e) => setForm({ ...form, last_seen: e.target.value })} /></div>
              <div><Label>Intensity (0–5)</Label>
                <Input type="number" min={0} max={5} value={form.intensity} onChange={(e) => setForm({ ...form, intensity: e.target.value })} /></div>
              <div><Label>Search presence (0–5)</Label>
                <Input type="number" min={0} max={5} value={form.search_presence} onChange={(e) => setForm({ ...form, search_presence: e.target.value })} /></div>
              <div><Label>Gap (0–5)</Label>
                <Input type="number" min={0} max={5} value={form.gap} onChange={(e) => setForm({ ...form, gap: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
            <div><Label>Why it hurts</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {REASONS.map((r) => {
                  const on = form.intensity_reasons.includes(r);
                  return (
                    <Button key={r} type="button" size="sm" variant={on ? "default" : "outline"}
                      onClick={() => setForm({ ...form, intensity_reasons: on ? form.intensity_reasons.filter((x) => x !== r) : [...form.intensity_reasons, r] })}>
                      {r}
                    </Button>
                  );
                })}
              </div></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.product_flag} onCheckedChange={(v) => setForm({ ...form, product_flag: v })} id="pf" />
              <Label htmlFor="pf">Could be a product</Label>
            </div>
            <div><Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={!form.pain_text.trim() || save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
