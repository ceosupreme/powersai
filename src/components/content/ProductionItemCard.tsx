import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { canApprove, type BoardItem } from "@/hooks/useContentProduction";
import { FORMAT_LABELS, STAGE_LABELS, nextStageForFormat } from "@/components/content/contentStages";

/** One Production Board card: scores, placements, Approve (existing rules) and next step. */
export function ProductionItemCard({
  item: it, brandName, approving, onApprove, onMove, onOpen,
}: {
  item: BoardItem;
  brandName: string;
  approving: boolean;
  onApprove: (it: BoardItem) => void;
  onMove: (it: BoardItem) => void;
  onOpen?: (it: BoardItem) => void;
}) {
  const next = nextStageForFormat(it.stage, it.format);
  return (
    <Card className="bg-card text-card-foreground border-border">
      <CardContent className="p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            {brandName}
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
        <h2 className="text-lg font-semibold leading-snug">{it.title}</h2>
        {onOpen && (
          <Button size="sm" variant="outline" className="w-full" onClick={() => onOpen(it)}>
            Open script, caption and files
          </Button>
        )}
        {it.due_date && <p className="text-sm font-medium">Due {it.due_date.slice(0, 10)}</p>}
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
          // An idea or a script in progress has nothing to approve yet, so say that instead of showing a locked button.
          if ((it.stage === "idea" || it.stage === "script") && it.quality_score == null) {
            return <p className="text-xs text-muted-foreground">Not written yet. Approve appears once it's written and scored.</p>;
          }
          const ok = canApprove(it);
          const why = it.quality_score == null
            ? "Needs a Quality Score before it can be approved."
            : (it.quality_fails ?? []).length > 0
              ? "Has hard fails that must be fixed first."
              : "Needs a Quality Score of 80 or more.";
          const btn = (
            <Button size="sm" className="w-full" disabled={!ok || approving}
              onClick={() => onApprove(it)}>Approve</Button>
          );
          return ok ? btn : (
            <div className="space-y-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><span tabIndex={0} className="block">{btn}</span></TooltipTrigger>
                <TooltipContent>{why}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground">{why}</p>
            </div>
          );
        })()}
        {next !== it.stage && (() => {
          const locked =
            !it.approved_at && (next === "scheduled" || next === "published");
          const btn = (
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-between h-auto whitespace-normal text-left py-2"
              disabled={locked}
              onClick={() => onMove(it)}
            >
              <span className="text-xs">
                {locked
                  ? "Approve first to schedule"
                  : next === 'scheduled' ? 'Record platform and scheduled time'
                    : next === 'published' ? 'Add live post link'
                    : `Move to next step — ${STAGE_LABELS[next]}`}
              </span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          );
          return locked ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="block">{btn}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[86vw] text-xs">
                  Not approved yet — an item must be approved before it can move
                  into Scheduled or Published.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : btn;
        })()}
      </CardContent>
    </Card>
  );
}
