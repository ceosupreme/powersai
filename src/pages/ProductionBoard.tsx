import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Film, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  useBrandProjects, useProductionBoardItems, useAdvanceStage,
  CONTENT_MODE_LABELS, PLACEMENT_CHANNELS, PURPOSE_TYPES, canApprove, useApproveItem,
  type BoardItem,
} from "@/hooks/useContentProduction";
import {
  FORMAT_LABELS, STAGE_LABELS, nextStageForFormat, type ContentStage,
} from "@/components/content/contentStages";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImportPackageDialog } from "@/components/content/ImportPackageDialog";

const TABS: { key: string; label: string; stages: ContentStage[] }[] = [
  { key: "research", label: "Research", stages: ["idea"] },
  { key: "writing", label: "Writing", stages: ["script"] },
  { key: "images", label: "Images", stages: ["design", "thumbnail"] },
  { key: "video", label: "Video", stages: ["record", "edit"] },
  { key: "scheduling", label: "Scheduling", stages: ["scheduled"] },
];

export default function ProductionBoard() {
  const { isAdmin } = useAuth();
  const { data: projects = [], isLoading: loadingProjects } = useBrandProjects();
  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const { data: items = [], isLoading, refetch } = useProductionBoardItems(projectIds);
  const advance = useAdvanceStage();
  const approve = useApproveItem();

  const [brand, setBrand] = useState("all");
  const [mode, setMode] = useState("all");
  const [channel, setChannel] = useState("all");
  const [importOpen, setImportOpen] = useState(false);

  const nameById = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])), [projects],
  );
  const modeById = useMemo(
    () => new Map(projects.map((p) => [p.id, p.content_mode])), [projects],
  );

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6">
        <Card className="bg-card text-card-foreground border-border">
          <CardContent className="p-6 text-sm text-muted-foreground">
            The Production Board is available to admins only.
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = items.filter((it) => {
    if (!projectIds.includes(it.project_id)) return false;
    if (brand !== "all" && it.project_id !== brand) return false;
    if (mode !== "all" && modeById.get(it.project_id) !== mode) return false;
    if (channel !== "all" && !it.placements.some((p) => p.channel === channel)) return false;
    return true;
  });

  const selectedProject = brand !== "all" ? projects.find((p) => p.id === brand) : undefined;
  const cutoff = Date.now() - 28 * 86400000;
  const recent = selectedProject
    ? items.filter((it) => it.project_id === brand && new Date(it.created_at).getTime() >= cutoff)
    : [];
  const mixCounts = PURPOSE_TYPES.map((pt) => ({
    pt, n: recent.filter((it) => it.purpose_type === pt).length,
  }));
  const untyped = recent.filter((it) => !it.purpose_type).length;
  const mixFlags: string[] = [];
  mixCounts.forEach(({ pt, n }) => {
    if (recent.length > 0 && n / recent.length > 0.5) mixFlags.push(`More than half of the last four weeks' pieces are "${pt}".`);
  });
  const offers = mixCounts.find((m) => m.pt === "offer")!.n;
  if (recent.length > 0 && offers / recent.length > 0.2) mixFlags.push("Offers are more than one in five pieces.");

  const doApprove = async (it: BoardItem) => {
    try { await approve.mutateAsync(it.id); toast.success("Approved"); }
    catch (e: any) { toast.error(e?.message ?? "Could not approve it"); }
  };

  const doneCount = filtered.filter((it) => it.stage === "published").length;

  const move = async (it: BoardItem) => {
    const next = nextStageForFormat(it.stage, it.format);
    if (next === it.stage) { toast.info("This one is already at the last step."); return; }
    try {
      await advance.mutateAsync({ id: it.id, stage: next });
      toast.success(`Moved to ${STAGE_LABELS[next]}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not move it");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 pb-24">
      <header className="flex flex-wrap items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Film className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <h1 className="text-2xl font-bold">Production Board</h1>
          <p className="text-sm text-muted-foreground">
            Every internal brand in one place, by production step.
          </p>
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1" /> Import package
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger><SelectValue placeholder="Content mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any content mode</SelectItem>
            {Object.entries(CONTENT_MODE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any channel</SelectItem>
            {PLACEMENT_CHANNELS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProject && (
        <Card className="bg-card text-card-foreground border-border">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-medium">
              Four-week mix — {selectedProject.name}{" "}
              <span className="text-muted-foreground font-normal">({recent.length} pieces in the last 28 days)</span>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pieces were created for this brand in the last 28 days.</p>
            ) : (
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" aria-label="Purpose mix">
                {mixCounts.filter((m) => m.n > 0).map((m, i) => (
                  <div key={m.pt} title={`${m.pt}: ${m.n}`}
                    className="h-full"
                    style={{ width: `${(m.n / recent.length) * 100}%`, background: `hsl(var(--primary) / ${1 - i * 0.14})` }} />
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
              {mixCounts.map(({ pt, n }) => {
                const target = selectedProject.mix_targets?.[pt];
                return (
                  <div key={pt} className="flex justify-between gap-2">
                    <span className="capitalize">{pt}</span>
                    <span className="text-muted-foreground">
                      {recent.length ? Math.round((n / recent.length) * 100) : 0}%
                      {" · target "}{target != null ? `${target}%` : "—"}
                    </span>
                  </div>
                );
              })}
              {untyped > 0 && (
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>No purpose set</span><span>{untyped}</span>
                </div>
              )}
            </div>
            {mixFlags.length > 0 && (
              <ul className="text-sm text-destructive space-y-0.5">
                {mixFlags.map((f) => <li key={f}>{f}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {loadingProjects || isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <Card className="bg-card text-card-foreground border-border">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No internal brand projects are switched on yet. Turn a brand project on from its project
            page, then come back here.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="research">
          <TabsList className="flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}{" "}
                <span className="ml-1 text-muted-foreground">
                  {filtered.filter((it) => t.stages.includes(it.stage as ContentStage)).length}
                </span>
              </TabsTrigger>
            ))}
            <span className="ml-2 self-center text-xs text-muted-foreground">
              Done: {doneCount}
            </span>
          </TabsList>

          {TABS.map((t) => {
            const rows = filtered.filter((it) => t.stages.includes(it.stage as ContentStage));
            return (
              <TabsContent key={t.key} value={t.key} className="mt-4">
                {rows.length === 0 ? (
                  <Card className="bg-card text-card-foreground border-border">
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      Nothing is at the {t.label.toLowerCase()} step. Add a content item on the
                      Content page, or import a finished package with the button above.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {rows.map((it) => {
                      const next = nextStageForFormat(it.stage, it.format);
                      return (
                        <Card key={it.id} className="bg-card text-card-foreground border-border">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="text-xs">
                                {nameById.get(it.project_id) ?? "Brand"}
                              </Badge>
                              {it.purpose_type && (
                                <Badge variant="outline" className="text-xs capitalize">{it.purpose_type}</Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px]">Idea {it.idea_score ?? "—"}</Badge>
                              <Badge variant="secondary" className="text-[10px]">Quality {it.quality_score ?? "—"}</Badge>
                              {it.approved_at && <Badge className="text-[10px]">Approved</Badge>}
                              {it.format && (
                                <Badge variant="secondary" className="text-xs">
                                  {(FORMAT_LABELS as any)[it.format] ?? it.format}
                                </Badge>
                              )}
                            </div>
                            <div className="font-medium leading-snug">{it.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {it.family?.title ?? "No family yet"}
                            </div>
                            {it.placements.length > 0 ? (
                              <ul className="space-y-1 text-xs text-muted-foreground">
                                {it.placements.map((p) => (
                                  <li key={p.id} className="flex items-center justify-between gap-2">
                                    <span>{p.channel}{p.account_label ? ` · ${p.account_label}` : ""}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {p.status.replace(/_/g, " ")}
                                    </Badge>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">No placements yet.</p>
                            )}
                            {(it.quality_fails ?? []).length > 0 && (
                              <ul className="text-xs text-destructive list-disc pl-4">
                                {(it.quality_fails ?? []).map((f) => <li key={f}>{f}</li>)}
                              </ul>
                            )}
                            {!it.approved_at && (() => {
                              const ok = canApprove(it);
                              const why = it.quality_score == null
                                ? "Needs a Quality Score before it can be approved."
                                : (it.quality_fails ?? []).length > 0
                                  ? "Has hard fails that must be fixed first."
                                  : "Needs a Quality Score of 80 or more.";
                              const btn = (
                                <Button size="sm" className="w-full" disabled={!ok || approve.isPending}
                                  onClick={() => doApprove(it)}>Approve</Button>
                              );
                              return ok ? btn : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild><span tabIndex={0} className="block">{btn}</span></TooltipTrigger>
                                    <TooltipContent>{why}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })()}
                            {next !== it.stage && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => move(it)}
                              >
                                <span className="text-xs">
                                  Move to next step — {STAGE_LABELS[next]}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <ImportPackageDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        projects={projects}
        onDone={() => refetch()}
      />
    </div>
  );
}
