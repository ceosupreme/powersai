import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useContentAutomationRuns, useUndoAutomationRun } from "@/hooks/useContentAutomationRuns";
import { toast } from "sonner";

interface Props {
  itemId: string;
}

export function ContentAutomationRuns({ itemId }: Props) {
  const { data: runs = [], isLoading } = useContentAutomationRuns(itemId);
  const undo = useUndoAutomationRun(itemId);

  const onUndo = async (runId: string) => {
    try {
      const res: any = await undo.mutateAsync(runId);
      toast.success(`Undone — removed ${res?.deleted ?? 0} task(s)`);
    } catch (e: any) {
      toast.error(e?.message || "Undo failed");
    }
  };

  return (
    <div className="border-t pt-4 mt-2">
      <Label className="text-sm font-semibold">Automation Runs</Label>
      <div className="mt-2 space-y-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : runs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No automations have run for this item.</p>
        ) : (
          runs.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
              <div className="flex flex-col">
                <span className="truncate">
                  Long-form publish kit — {r.tasks_created} task{r.tasks_created === 1 ? "" : "s"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                  {r.error ? ` — ${r.error}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Badge variant={r.status === "completed" ? "default" : r.status === "undone" ? "outline" : "destructive"}>
                  {r.status}
                </Badge>
                {r.status === "completed" && (
                  <Button size="sm" variant="outline" disabled={undo.isPending} onClick={() => onUndo(r.id)}>
                    Undo
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}