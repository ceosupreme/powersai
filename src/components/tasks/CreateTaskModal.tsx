import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, ExternalLink, Plus } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ASANA_TEAM, createAsanaTask } from "@/services/asana";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export interface PrefillContext {
  sourceInsightId?: string;
  sourceTitle?: string;
  venueId?: string;
  pillar?: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: PrefillContext;
}

const PILLARS = ["Revenue", "Labor", "Operations", "Guest Experience"] as const;
const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export function CreateTaskModal({ open, onOpenChange, prefill }: CreateTaskModalProps) {
  const { accessibleBars, selectedBar } = useApp();
  const { session } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venueId, setVenueId] = useState<string>("");
  const [assigneeGid, setAssigneeGid] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [pillar, setPillar] = useState<string>("");
  const [priority, setPriority] = useState<string>("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when modal opens or prefill changes
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription(
      prefill?.sourceTitle ? `Related to: ${prefill.sourceTitle}\n\n` : "",
    );
    setVenueId(prefill?.venueId || selectedBar?.id || "");
    setAssigneeGid("");
    setDueDate(undefined);
    setPillar(prefill?.pillar || "");
    setPriority("Medium");
    setError(null);
  }, [open, prefill, selectedBar?.id]);

  const venueOptions = useMemo(() => accessibleBars || [], [accessibleBars]);
  const selectedVenue = useMemo(
    () => venueOptions.find((b) => b.id === venueId),
    [venueOptions, venueId],
  );

  const canSubmit = title.trim().length > 0 && venueId.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    const userId = session?.user?.id;
    if (!userId) {
      setError("You must be signed in to create a task.");
      setSubmitting(false);
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const dueDateStr = dueDate ? format(dueDate, "yyyy-MM-dd") : null;

      // 1. Insert action_items row
      const insertPayload: any = {
        bar_id: venueId,
        title: title.trim(),
        detail: description.trim() || null,
        pillar: pillar || null,
        priority: priority || null,
        due_date: dueDateStr,
        approval_status: "Approved",
        status: "Open",
        source: "manual",
        is_manual: true,
        created_by_id: userId,
        created_at_manual: nowIso,
        approved_by_id: userId,
        approved_at: nowIso,
        auto_approved: false,
        source_insight_id: prefill?.sourceInsightId || null,
        // Mirror title onto insight_title for UI fallbacks
        insight_title: title.trim(),
        insight_summary: description.trim() || null,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("action_items")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr || !inserted) {
        throw new Error(insertErr?.message || "Failed to create task row");
      }

      // 2. Resolve venue's Asana project/section config
      const { data: venueRow } = await supabase
        .from("venues")
        .select("name,bar_code,asana_write_project_gid,asana_write_section_gid,asana_project_gid,asana_score_section_gid")
        .eq("id", venueId)
        .maybeSingle();

      const projectGid =
        (venueRow as any)?.asana_write_project_gid ||
        (venueRow as any)?.asana_project_gid ||
        undefined;
      const sectionGid =
        (venueRow as any)?.asana_write_section_gid ||
        (venueRow as any)?.asana_score_section_gid ||
        undefined;
      const barCode = (venueRow as any)?.bar_code || undefined;

      // 3. Push to Asana
      let asanaUrl: string | null = null;
      try {
        const notes = [
          description.trim(),
          pillar ? `Pillar: ${pillar}` : null,
          priority ? `Priority: ${priority}` : null,
          dueDateStr ? `Due: ${dueDateStr}` : null,
          "",
          "Created manually from BarPulse",
        ]
          .filter((v) => v !== null)
          .join("\n");

        const asanaTask = await createAsanaTask({
          title: title.trim(),
          notes,
          dueDate: dueDateStr || undefined,
          assigneeGid: assigneeGid || undefined,
          barCode,
          projectGid,
          sectionGid,
        });
        asanaUrl = asanaTask.permalink_url;

        await supabase
          .from("action_items")
          .update({
            asana_task_gid: asanaTask.gid,
            asana_task_url: asanaTask.permalink_url,
            asana_task_status: "open",
            asana_assignee_gid: assigneeGid || null,
            asana_assignee_name:
              ASANA_TEAM.find((m) => m.gid === assigneeGid)?.name || null,
            asana_due_on: dueDateStr,
            synced_to_asana_at: new Date().toISOString(),
          })
          .eq("id", inserted.id);
      } catch (asanaErr) {
        // Soft-fail Asana sync — keep row, mark sync_error so cron retries
        const msg = asanaErr instanceof Error ? asanaErr.message : "Unknown Asana error";
        await supabase
          .from("action_items")
          .update({ asana_task_status: "sync_error" })
          .eq("id", inserted.id);
        throw new Error(`Task saved, but Asana sync failed: ${msg}`);
      }

      sonnerToast.success("Task created and synced to Asana", {
        description: title.trim(),
        action: asanaUrl
          ? {
              label: "Open",
              onClick: () => window.open(asanaUrl!, "_blank"),
            }
          : undefined,
      });
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Create Task
          </DialogTitle>
          <DialogDescription>
            {prefill?.sourceInsightId
              ? "This task will be linked to its source insight."
              : "Create an Asana task. It bypasses the AI review queue."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ct-title">Title *</Label>
            <Input
              id="ct-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ct-desc">Description</Label>
            <Textarea
              id="ct-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Add details…"
              disabled={submitting}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Venue *</Label>
              <Select value={venueId} onValueChange={setVenueId} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue">
                    {selectedVenue?.bar_name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {venueOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bar_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select
                value={assigneeGid}
                onValueChange={setAssigneeGid}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {ASANA_TEAM.map((m) => (
                    <SelectItem key={m.gid} value={m.gid}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dueDate ? format(dueDate, "PPP") : "Pick"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Pillar</Label>
              <Select value={pillar} onValueChange={setPillar} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {PILLARS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
