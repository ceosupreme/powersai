import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  ContentStage,
  FORMAT_LABELS,
  STAGES,
  STAGE_LABELS,
  nextStage,
} from "./contentStages";
import { ContentItem, useContentItemMutations } from "@/hooks/useContentItems";

interface Props {
  items: ContentItem[];
  projectId: string;
  onEdit: (item: ContentItem) => void;
}

export function ContentKanbanView({ items, projectId, onEdit }: Props) {
  const { update } = useContentItemMutations(projectId);

  const grouped = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    STAGES.forEach((s) => (map[s] = []));
    items.forEach((it) => {
      const k = (STAGES as readonly string[]).includes(it.stage) ? it.stage : "idea";
      (map[k] ||= []).push(it);
    });
    return map;
  }, [items]);

  const advance = async (it: ContentItem) => {
    const ns = nextStage(it.stage as ContentStage);
    if (ns === it.stage) return;
    try {
      await update.mutateAsync({ id: it.id, patch: { stage: ns } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
      {STAGES.map((stage) => (
        <div key={stage} className="bg-muted/30 rounded-lg p-2 min-h-[300px]">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
            <Badge variant="outline">{grouped[stage]?.length ?? 0}</Badge>
          </div>
          <div className="space-y-2">
            {grouped[stage].map((it) => {
              const ns = nextStage(it.stage as ContentStage);
              const canAdvance = ns !== it.stage;
              return (
                <Card key={it.id} className="cursor-pointer" onClick={() => onEdit(it)}>
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-medium line-clamp-2">{it.title}</div>
                    <div className="flex flex-wrap gap-1">
                      {it.format && (
                        <Badge variant="outline" className="text-xs">
                          {(FORMAT_LABELS as any)[it.format] ?? it.format}
                        </Badge>
                      )}
                      {it.is_repurposed && <Badge variant="secondary" className="text-xs">Repurposed</Badge>}
                      {it.is_monetized && <Badge variant="secondary" className="text-xs">Monetized</Badge>}
                    </div>
                    {it.due_date && (
                      <div className="text-xs text-muted-foreground">Due {it.due_date}</div>
                    )}
                    {canAdvance && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-full justify-between"
                        onClick={(e) => { e.stopPropagation(); advance(it); }}
                      >
                        <span className="text-xs">→ {STAGE_LABELS[ns]}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}