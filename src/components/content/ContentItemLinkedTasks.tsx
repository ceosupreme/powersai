import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTask } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TaskPriority, TaskStatus } from "@/types/tasks";

interface Props {
  itemId: string;
  projectId: string;
}

interface LinkedTaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
}

export function ContentItemLinkedTasks({ itemId, projectId }: Props) {
  const qc = useQueryClient();
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [dueDate, setDueDate] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["content-item-tasks", itemId],
    queryFn: async (): Promise<LinkedTaskRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, due_date")
        .eq("content_item_id", itemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LinkedTaskRow[];
    },
  });

  const onAdd = async () => {
    if (!title.trim()) return;
    await createTask.mutateAsync({
      bar_id: String(projectId),
      title: title.trim(),
      priority,
      status: "Todo",
      due_date: dueDate || undefined,
      content_item_id: itemId,
    } as any);
    setTitle("");
    setDueDate("");
    setPriority("Medium");
    qc.invalidateQueries({ queryKey: ["content-item-tasks", itemId] });
  };

  return (
    <div className="border-t pt-4 mt-2">
      <Label className="text-sm font-semibold">Linked Tasks</Label>
      <div className="mt-2 space-y-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks linked yet.</p>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
              <span className="truncate flex-1">{t.title}</span>
              <div className="flex items-center gap-2 ml-2">
                {t.due_date && <span className="text-xs text-muted-foreground">{t.due_date}</span>}
                <Badge variant="outline">{t.status}</Badge>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 grid grid-cols-12 gap-2 items-end">
        <div className="col-span-6">
          <Label className="text-xs">New task title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cut 5 Shorts from video" />
        </div>
        <div className="col-span-3">
          <Label className="text-xs">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Due</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="col-span-1">
          <Button size="sm" onClick={onAdd} disabled={!title.trim() || createTask.isPending}>Add</Button>
        </div>
      </div>
    </div>
  );
}