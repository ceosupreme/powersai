import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, ExternalLink, FileText, FolderOpen, Image as ImageIcon, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDailyPosts } from "@/hooks/useDailyPosts";
import {
  countDailyPostsByStatus,
  DAILY_POST_STATUS_LABELS,
  DAILY_POST_STATUS_ORDER,
  filterDailyPostsByDate,
  plainWaitingReason,
  qualityLabel,
  type DailyPostDateWindow,
  type DailyPostPackage,
  type DailyPostPlacement,
  type DailyPostStatus,
} from "@/lib/dailyPosts";
import { MarkPostedDialog } from "./MarkPostedDialog";

const STATUS_TONE: Record<DailyPostStatus, string> = {
  ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  almost_ready: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  waiting_on_owner: "border-destructive/40 bg-destructive/10 text-destructive",
  scheduled: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  posted: "border-border bg-muted text-muted-foreground",
};

const DATE_WINDOWS: { key: DailyPostDateWindow; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "last7", label: "Last 7 days" },
];

interface Props {
  projectIds?: string[];
  singleBrand?: boolean;
  defaultWindow?: DailyPostDateWindow;
  title?: string;
}

export function DailyPostsSection({ projectIds, singleBrand = false, defaultWindow = "today", title = "Daily posts" }: Props) {
  const { data: allPackages = [], isLoading, isError, refetch } = useDailyPosts(projectIds);
  const [dateWindow, setDateWindow] = useState<DailyPostDateWindow>(defaultWindow);
  const [statusFilter, setStatusFilter] = useState<DailyPostStatus | "all">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [marking, setMarking] = useState<{ placement: DailyPostPlacement; brandName: string } | null>(null);

  const inWindow = useMemo(
    () => filterDailyPostsByDate(allPackages, dateWindow),
    [allPackages, dateWindow],
  );

  const brandScoped = useMemo(
    () => (brandFilter === "all" ? inWindow : inWindow.filter((p) => p.project_id === brandFilter)),
    [inWindow, brandFilter],
  );

  const counts = useMemo(() => countDailyPostsByStatus(brandScoped), [brandScoped]);

  const visible = useMemo(
    () => (statusFilter === "all" ? brandScoped : brandScoped.filter((p) => p.post_status === statusFilter)),
    [brandScoped, statusFilter],
  );

  const brands = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of inWindow) map.set(p.project_id, p.brand_name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [inWindow]);

  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <p role="status" className="text-sm text-destructive">
        Could not load daily posts. <button className="underline" onClick={() => refetch()}>Try again</button>
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {DATE_WINDOWS.map((w) => (
            <Button
              key={w.key}
              type="button"
              size="sm"
              variant={dateWindow === w.key ? "default" : "outline"}
              onClick={() => setDateWindow(w.key)}
            >
              {w.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Five-number posts meter */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {DAILY_POST_STATUS_ORDER.map((st) => {
          const active = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(active ? "all" : st)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                active ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50",
              )}
            >
              <div className="text-2xl font-bold text-foreground">{counts[st]}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{DAILY_POST_STATUS_LABELS[st]}</div>
            </button>
          );
        })}
      </div>

      {!singleBrand && brands.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant={brandFilter === "all" ? "secondary" : "ghost"} onClick={() => setBrandFilter("all")}>
            All brands
          </Button>
          {brands.map(([id, name]) => (
            <Button key={id} size="sm" variant={brandFilter === id ? "secondary" : "ghost"} onClick={() => setBrandFilter(id)}>
              {name}
            </Button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-5 text-sm text-muted-foreground">
            {allPackages.length === 0
              ? "No daily post packages have been written to HQ yet. Once the nightly posting job saves them, they will appear here ranked by quality."
              : "No posts match this day and status."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((pkg) => (
            <DailyPostCard
              key={pkg.id}
              pkg={pkg}
              showBrand={!singleBrand}
              onMarkPosted={(placement) => setMarking({ placement, brandName: pkg.brand_name })}
            />
          ))}
        </div>
      )}

      <MarkPostedDialog
        placement={marking?.placement ?? null}
        brandName={marking?.brandName ?? ""}
        onClose={() => setMarking(null)}
      />
    </section>
  );
}

function DailyPostCard({
  pkg,
  showBrand,
  onMarkPosted,
}: {
  pkg: DailyPostPackage;
  showBrand: boolean;
  onMarkPosted: (placement: DailyPostPlacement) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCaption = async (pl: DailyPostPlacement) => {
    const text = [pl.caption, pl.hashtags].filter(Boolean).join("\n\n").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(pl.id);
      toast.success("Caption copied.");
      setTimeout(() => setCopiedId((cur) => (cur === pl.id ? null : cur)), 2000);
    } catch {
      toast.error("Could not copy caption.");
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-0.5">
            {showBrand && <div className="text-xs font-medium text-muted-foreground">{pkg.brand_name}</div>}
            <div className="text-base font-semibold text-foreground">{pkg.title}</div>
            <div className="text-xs text-muted-foreground">
              {pkg.post_date}
              {pkg.made_by ? ` · made by ${pkg.made_by}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={STATUS_TONE[pkg.post_status]}>
              {DAILY_POST_STATUS_LABELS[pkg.post_status]}
            </Badge>
            <Badge variant="secondary">
              {qualityLabel(pkg.quality_score)}
              {pkg.quality_score != null ? ` · ${pkg.quality_score}` : ""}
            </Badge>
          </div>
        </div>

        {pkg.post_status === "waiting_on_owner" && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {plainWaitingReason(pkg.waiting_reason, pkg.waiting_detail)}
          </p>
        )}

        {pkg.post_status === "almost_ready" && pkg.almost_ready_detail && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-md px-3 py-2">
            {pkg.almost_ready_detail}
          </p>
        )}

        {pkg.media.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pkg.media.map((m, idx) => (
              <a
                key={`${m.drive_file_id ?? m.url ?? idx}`}
                href={m.url ?? (m.drive_file_id ? `https://drive.google.com/file/d/${m.drive_file_id}/view` : "#")}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 w-36 rounded-md border border-border bg-muted/40 p-2.5 flex flex-col gap-1.5 hover:bg-muted"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  {m.kind === "video" ? <Video className="h-4 w-4 shrink-0" /> : <ImageIcon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{m.name || `${m.kind} ${idx + 1}`}</span>
                </div>
                <span className="text-xs text-primary inline-flex items-center gap-1">
                  Open file <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            ))}
          </div>
        )}

        {pkg.placements.length > 0 && (
          <Tabs defaultValue={pkg.placements[0].id} className="w-full">
            <TabsList className="flex-wrap h-auto">
              {pkg.placements.map((pl) => (
                <TabsTrigger key={pl.id} value={pl.id} className="capitalize">
                  {pl.channel}
                  {pl.status === "published" ? " ✓" : ""}
                </TabsTrigger>
              ))}
            </TabsList>
            {pkg.placements.map((pl) => (
              <TabsContent key={pl.id} value={pl.id} className="mt-2 space-y-2.5">
                {pl.scheduled_for && (
                  <div className="text-xs text-muted-foreground">
                    Posting time: {new Date(pl.scheduled_for).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PT
                  </div>
                )}
                {pl.caption ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap rounded-md bg-muted/40 p-3 leading-relaxed">
                    {pl.caption}
                    {pl.hashtags ? `\n\n${pl.hashtags}` : ""}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No caption saved on this platform yet.</p>
                )}
                {pl.posted_no_link_at && pl.status !== "published" && (
                  <p className="text-xs text-muted-foreground">Noted as posted without a live link yet.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {pl.caption && (
                    <Button type="button" size="sm" variant="outline" onClick={() => copyCaption(pl)}>
                      {copiedId === pl.id ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                      {copiedId === pl.id ? "Copied" : "Copy caption"}
                    </Button>
                  )}
                  {pl.status === "published" && pl.live_url ? (
                    <Button asChild size="sm" variant="secondary">
                      <a href={pl.live_url} target="_blank" rel="noreferrer">
                        View live post <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      </a>
                    </Button>
                  ) : (
                    <Button type="button" size="sm" onClick={() => onMarkPosted(pl)}>
                      Mark posted
                    </Button>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
          {pkg.drive_folder_url && (
            <Button asChild size="sm" variant="outline">
              <a href={pkg.drive_folder_url} target="_blank" rel="noreferrer">
                <FolderOpen className="h-3.5 w-3.5 mr-1.5" /> Open folder
              </a>
            </Button>
          )}
          {pkg.post_this_doc_url && (
            <Button asChild size="sm" variant="outline">
              <a href={pkg.post_this_doc_url} target="_blank" rel="noreferrer">
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Open POST THIS
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}