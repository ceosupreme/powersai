import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, ExternalLink, Plus, Link2,
} from "lucide-react";
import { CreateTaskModal, PrefillContext } from "@/components/tasks/CreateTaskModal";

type AuditRow = {
  id: string;
  source: "action_item" | "insight";
  insight_id: string;
  title: string;
  pillar: string | null;
  bar_id: string;
  venue_name?: string;
  approval_status: "Approved" | "Rejected";
  decided_at: string | null;
  decided_by_id: string | null;
  decided_by_name?: string;
  rejection_reason?: string | null;
  asana_task_url?: string | null;
  asana_task_status?: string | null;
  // Manual task fields
  is_manual?: boolean;
  source_insight_id?: string | null;
  source_insight_title?: string | null;
  // Expanded panel content
  summary?: string | null;
  what_happened?: string | null;
  action_text?: string | null;
  source_type?: string | null;
  source_date?: string | null;
};

type SortKey = "decided_at" | "asana_task_status" | "venue_name";
type SortDir = "asc" | "desc";

const tone: Record<string, string> = {
  Approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Rejected: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const manualTone = "bg-violet-500/15 text-violet-300 border-violet-500/30";

const asanaTone: Record<string, string> = {
  open: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  overdue: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  sync_error: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fmtSourceDate(s: string | null | undefined): string | null {
  if (!s) return null;
  // Manual parse to avoid UTC shift on YYYY-MM-DD strings
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return new Date(s).toLocaleDateString();
}

function prettySourceType(s: string | null | undefined): string | null {
  if (!s) return null;
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SortHeader({
  label, columnKey, sortKey, sortDir, onSort,
}: {
  label: string;
  columnKey: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === columnKey;
  const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <Icon className={`w-3.5 h-3.5 ${active ? "text-foreground" : "text-muted-foreground/60"}`} />
    </button>
  );
}

function ExpandedSection({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-sm text-foreground/90 whitespace-pre-wrap">
        {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

const InsightsAudit = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"approved" | "rejected" | "all">("approved");
  const [sortKey, setSortKey] = useState<SortKey>("decided_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskPrefill, setCreateTaskPrefill] = useState<PrefillContext | undefined>(undefined);

  const openCreateTask = (prefill?: PrefillContext) => {
    setCreateTaskPrefill(prefill);
    setCreateTaskOpen(true);
  };

  const handleSort = (k: SortKey) => {
    setExpandedId(null);
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "decided_at" ? "desc" : "asc");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      const actionSelect = "id,title,insight_title,insight_summary,detail,problem_detail,facts,source,pillar,bar_id,insight_id,approval_status,approved_at,approved_by_id,rejected_at,rejected_by_id,rejection_reason,asana_task_url,asana_task_status,is_manual,source_insight_id,created_by_id,created_at_manual";
      const insightSelect = "id,title,summary,detail,pillar,bar_id,status,source_type,source_date,approved_at,approved_by_id,rejected_at,rejected_by_id,rejection_reason";

      // Split queries per bucket so a single 500-row cap can't starve another
      // bucket, and sort by the timestamp meaningful to that bucket (Postgres
      // `ORDER BY ts DESC` defaults to NULLS FIRST — force NULLs to the end
      // so rows with real timestamps win the 500-row budget).
      // No FK embeds here — embeds against tightened-RLS `insights` were
      // silently truncating result pages. We resolve the joins client-side.
      const [aApproved, aRejected, aManual, iActioned, iDismissed, vRes, pRes] = await Promise.all([
        supabase.from("action_items").select(actionSelect)
          .eq("approval_status", "Approved")
          .order("approved_at", { ascending: false, nullsFirst: false })
          .limit(500),
        supabase.from("action_items").select(actionSelect)
          .eq("approval_status", "Rejected")
          .order("rejected_at", { ascending: false, nullsFirst: false })
          .limit(500),
        supabase.from("action_items").select(actionSelect)
          .eq("is_manual", true)
          .order("created_at_manual", { ascending: false, nullsFirst: false })
          .limit(500),
        supabase.from("insights").select(insightSelect)
          .eq("status", "Actioned")
          .order("approved_at", { ascending: false, nullsFirst: false })
          .limit(500),
        supabase.from("insights").select(insightSelect)
          .eq("status", "Dismissed")
          .order("rejected_at", { ascending: false, nullsFirst: false })
          .limit(500),
        supabase.from("venues").select("id,name"),
        supabase.from("profiles").select("id,full_name,email"),
      ]);

      // Merge + dedupe by id (a Manual action_item can also be Approved/Rejected)
      const actionById = new Map<string, any>();
      for (const r of [...(aApproved.data || []), ...(aRejected.data || []), ...(aManual.data || [])]) {
        if (!actionById.has(r.id)) actionById.set(r.id, r);
      }
      const insightById = new Map<string, any>();
      for (const r of [...(iActioned.data || []), ...(iDismissed.data || [])]) {
        if (!insightById.has(r.id)) insightById.set(r.id, r);
      }
      const actionRows = Array.from(actionById.values());
      const insightRows = Array.from(insightById.values());

      // Resolve insight + source_insight joins client-side via a single batched fetch.
      const insightIdsToFetch = new Set<string>();
      const sourceInsightIdsToFetch = new Set<string>();
      for (const a of actionRows) {
        if (a.insight_id) insightIdsToFetch.add(a.insight_id);
        if (a.source_insight_id) sourceInsightIdsToFetch.add(a.source_insight_id);
      }
      const allInsightIds = Array.from(new Set([...insightIdsToFetch, ...sourceInsightIdsToFetch]));
      const insightJoin = allInsightIds.length
        ? await supabase
            .from("insights")
            .select("id,title,pillar,summary,detail,source_type,source_date")
            .in("id", allInsightIds)
        : { data: [] as any[] };
      const insightDetailsMap = new Map<string, any>();
      for (const i of insightJoin.data || []) insightDetailsMap.set(i.id, i);

      const aRes = { data: actionRows } as { data: any[] };
      const iRes = { data: insightRows } as { data: any[] };

      if (cancelled) return;

      const venueMap = new Map<string, string>();
      for (const v of vRes.data || []) venueMap.set(v.id, v.name);
      const profileMap = new Map<string, string>();
      for (const p of pRes.data || []) {
        profileMap.set(p.id, p.full_name || p.email || "Unknown");
      }

      const out: AuditRow[] = [];

      for (const a of (aRes.data || []) as any[]) {
        const status = a.approval_status as "Approved" | "Rejected";
        const joined = (a.insight_id && insightDetailsMap.get(a.insight_id)) || {};
        const sourceJoined = a.source_insight_id ? insightDetailsMap.get(a.source_insight_id) || null : null;

        const isManual = !!a.is_manual;
        // For manual rows, use created_by/created_at_manual as the "decided" attribution
        const decidedAt = isManual
          ? a.created_at_manual
          : status === "Approved"
            ? a.approved_at
            : a.rejected_at;
        const decidedById = isManual
          ? a.created_by_id
          : status === "Approved"
            ? a.approved_by_id
            : a.rejected_by_id;

        out.push({
          id: a.id,
          source: "action_item",
          insight_id: a.insight_id || a.source_insight_id || a.id,
          title: a.title || a.insight_title || "Untitled",
          pillar: joined.pillar ?? a.pillar,
          bar_id: a.bar_id,
          venue_name: venueMap.get(a.bar_id),
          approval_status: status,
          decided_at: decidedAt,
          decided_by_id: decidedById,
          decided_by_name: profileMap.get(decidedById || ""),
          rejection_reason: a.rejection_reason,
          asana_task_url: a.asana_task_url,
          asana_task_status: a.asana_task_status,
          is_manual: isManual,
          source_insight_id: a.source_insight_id || null,
          source_insight_title: sourceJoined?.title || null,
          summary: joined.summary ?? a.insight_summary,
          what_happened: joined.detail ?? a.problem_detail ?? a.facts,
          action_text: a.detail,
          source_type: isManual ? "manual" : (joined.source_type ?? a.source),
          source_date: joined.source_date,
        });
      }

      for (const i of (iRes.data || []) as any[]) {
        const status = i.status === "Actioned" ? "Approved" : "Rejected";
        out.push({
          id: i.id,
          source: "insight",
          insight_id: i.id,
          title: i.title,
          pillar: i.pillar,
          bar_id: i.bar_id,
          venue_name: venueMap.get(i.bar_id),
          approval_status: status,
          decided_at: status === "Approved" ? i.approved_at : i.rejected_at,
          decided_by_id: status === "Approved" ? i.approved_by_id : i.rejected_by_id,
          decided_by_name: profileMap.get(
            (status === "Approved" ? i.approved_by_id : i.rejected_by_id) || "",
          ),
          rejection_reason: i.rejection_reason,
          summary: i.summary,
          what_happened: i.detail,
          action_text: null,
          source_type: i.source_type,
          source_date: i.source_date,
        });
      }

      setRows(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset expanded row when filter/tab changes to avoid ghost panels
  useEffect(() => {
    setExpandedId(null);
  }, [filter, tab]);

  const filtered = useMemo(() => {
    const result = rows.filter((r) => {
      if (tab === "approved" && r.approval_status !== "Approved") return false;
      if (tab === "rejected" && r.approval_status !== "Rejected") return false;
      if (!filter.trim()) return true;
      const f = filter.toLowerCase();
      return (
        r.title.toLowerCase().includes(f) ||
        (r.venue_name || "").toLowerCase().includes(f) ||
        (r.decided_by_name || "").toLowerCase().includes(f) ||
        (r.pillar || "").toLowerCase().includes(f)
      );
    });

    const dir = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const av = (a[sortKey] as string | null) || "";
      const bv = (b[sortKey] as string | null) || "";
      if (!av && bv) return 1;
      if (av && !bv) return -1;
      if (!av && !bv) return 0;
      if (sortKey === "decided_at") {
        return av.localeCompare(bv) * dir;
      }
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir;
    });
    return result;
  }, [rows, filter, tab, sortKey, sortDir]);

  const toggleExpand = (rowKey: string) => {
    setExpandedId((curr) => (curr === rowKey ? null : rowKey));
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-8 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Insights Audit</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Who approved or rejected each insight, when, and the resulting Asana task status.
          </p>
        </div>
        <Link to="/insights" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Back to Insights
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Filter by title, venue, person, or pillar"
          className="max-w-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="text-xs text-muted-foreground ml-auto">
          {loading ? "Loading…" : `${filtered.length} of ${rows.length}`}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Title</TableHead>
              <TableHead>Pillar</TableHead>
              <TableHead>
                <SortHeader label="Venue" columnKey="venue_name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>By</TableHead>
              <TableHead>
                <SortHeader label="When" columnKey="decided_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortHeader label="Asana" columnKey="asana_task_status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const rowKey = `${r.source}-${r.id}`;
              const isExpanded = expandedId === rowKey;
              const sourceBits = [
                prettySourceType(r.source_type),
                r.venue_name,
                fmtSourceDate(r.source_date),
              ].filter(Boolean);
              const sourceLine = sourceBits.length ? sourceBits.join(" • ") : null;

              return (
                <Fragment key={rowKey}>
                  <TableRow
                    onClick={() => toggleExpand(rowKey)}
                    className="cursor-pointer hover:bg-muted/30"
                    data-state={isExpanded ? "selected" : undefined}
                  >
                    <TableCell className="pr-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-[360px]">
                      <div className="font-medium truncate">{r.title}</div>
                      {r.rejection_reason && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          “{r.rejection_reason}”
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.pillar || "—"}</TableCell>
                    <TableCell className="text-sm">{r.venue_name || r.bar_id.slice(0, 6)}</TableCell>
                    <TableCell>
                      {r.is_manual ? (
                        <Badge className={manualTone} variant="outline">
                          Manual
                        </Badge>
                      ) : (
                        <Badge className={tone[r.approval_status]} variant="outline">
                          {r.approval_status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.decided_by_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.decided_at)}</TableCell>
                    <TableCell>
                      {r.asana_task_url ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {r.asana_task_status && (
                            <Badge className={asanaTone[r.asana_task_status] || ""} variant="outline">
                              {r.asana_task_status}
                            </Badge>
                          )}
                          <Button asChild variant="ghost" size="sm">
                            <a href={r.asana_task_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${rowKey}-detail`} className="bg-muted/20 hover:bg-muted/20">
                      <TableCell />
                      <TableCell colSpan={7} className="py-4">
                        <div className="space-y-4 max-w-4xl">
                          <div>
                            <div className="text-base font-semibold text-foreground leading-snug">
                              {r.title}
                            </div>
                            {sourceLine && (
                              <div className="text-xs text-muted-foreground mt-1">{sourceLine}</div>
                            )}
                            {r.is_manual && r.source_insight_id && r.source_insight_title && (
                              <div className="mt-2 text-xs flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5 text-violet-400" />
                                <span className="text-muted-foreground">Spawned from:</span>
                                <Link
                                  to={`/insights?bar=${r.bar_id}&focus=${r.source_insight_id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-violet-300 hover:text-violet-200 underline-offset-4 hover:underline"
                                >
                                  {r.source_insight_title}
                                </Link>
                              </div>
                            )}
                          </div>
                          <ExpandedSection label="Summary" value={r.summary} />
                          <ExpandedSection label="What Happened" value={r.what_happened} />
                          {r.source === "action_item" && (
                            <ExpandedSection label="Action Taken / Proposed" value={r.action_text} />
                          )}
                          {r.rejection_reason && (
                            <ExpandedSection label="Rejection Reason" value={r.rejection_reason} />
                          )}
                          <div className="pt-2 border-t border-border/50 flex justify-end" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openCreateTask({
                                  sourceInsightId: r.insight_id,
                                  sourceTitle: r.title,
                                  venueId: r.bar_id,
                                  pillar: r.pillar || undefined,
                                })
                              }
                              className="gap-1.5 border-primary/30 hover:border-primary/60 hover:bg-primary/10"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add related task
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  No records.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateTaskModal
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        prefill={createTaskPrefill}
      />
    </div>
  );
};

export default InsightsAudit;
