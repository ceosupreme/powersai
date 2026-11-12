import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  FORMAT_LABELS,
  STAGES,
  STAGE_LABELS,
  flowForFormat,
  nextStageForFormat,
} from "./contentStages";
import { ContentItem } from "@/hooks/useContentItems";

interface Props {
  items: ContentItem[];
  projectId: string;
  onEdit: (item: ContentItem) => void;
  onOpenWorkflow: (item: ContentItem) => void;
}

/** One source of truth: these columns read content_items.stage.
 * Completing a step must happen in ContentWorkflowDialog, never by
 * blindly incrementing the stage or pretending a post was scheduled.
 */
export function ContentKanbanView({ items, onEdit, onOpenWorkflow }: Props) {
  const grouped = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    STAGES.forEach((stage) => { map[stage] = []; });
    items.forEach(item => {
      const stage = (STAGES as readonly string[]).includes(item.stage) ? item.stage : "idea";
      map[stage].push(item);
    });
    return map;
  }, [items]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
      {STAGES.map(stage => (
        <div key={stage} className="bg-muted/30 rounded-lg p-2 min-h-[300px]">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-sm font-semibold">{STAGE_LABELS[stage]}</span>
            <Badge variant="outline">{grouped[stage]?.length ?? 0}</Badge>
          </div>
          <div className="space-y-2">
            {grouped[stage].map(item => {
              const flow = flowForFormat(item.format);
              const isExpectedStage = flow.some(s => s === item.stage);
              const next = isExpectedStage ? nextStageForFormat(item.stage, item.format) : null;
              return (
                <Card key={item.id} className="cursor-pointer" onClick={() => onOpenWorkflow(item)}>
                  <CardContent className="p-3 space-y-2">
                    <div className="text-sm font-medium line-clamp-2">{item.title}</div>
                    <div className="flex flex-wrap gap-1">
                      {item.format && <Badge variant="outline" className="text-xs">
                        {(FORMAT_LABELS as any)[item.format] ?? item.format}
                      </Badge>}
                      {item.is_repurposed && <Badge variant="secondary" className="text-xs">Repurposed</Badge>}
                      {item.is_monetized && <Badge variant="secondary" className="text-xs">Monetized</Badge>}
                    </div>
                    {item.due_date && <div className="text-xs text-muted-foreground">Due {item.due_date}</div>}
                    <Button size="sm" variant="ghost" className="h-7 w-full justify-between"
                      onClick={event => { event.stopPropagation(); onOpenWorkflow(item); }}>
                      <span className="text-xs">{next && next !== item.stage
                        ? `Work toward ${STAGE_LABELS[next]}`
                        : 'Open production details'}</span>
                      <ArrowRight className="h-3 w-3"/>
                    </Button>
                    {!isExpectedStage && <Button size="sm" variant="outline" className="w-full"
                      onClick={event => { event.stopPropagation(); onEdit(item); }}>
                      Review format or stage
                    </Button>}
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
