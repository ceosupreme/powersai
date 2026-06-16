import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ContentStage,
  FORMAT_LABELS,
  STAGES,
  STAGE_LABELS,
} from "./contentStages";
import { ContentItem, useContentItemMutations } from "@/hooks/useContentItems";

interface Props {
  items: ContentItem[];
  projectId: string;
  onEdit: (item: ContentItem) => void;
}

export function ContentListView({ items, projectId, onEdit }: Props) {
  const { update, remove } = useContentItemMutations(projectId);

  const changeStage = async (id: string, stage: string) => {
    try {
      await update.mutateAsync({ id, patch: { stage } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this content item?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No content items yet. Click "New Content Item" to add one.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              <TableCell className="font-medium">{it.title}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {it.format ? (FORMAT_LABELS as any)[it.format] ?? it.format : "—"}
              </TableCell>
              <TableCell>
                <Select value={it.stage} onValueChange={(v) => changeStage(it.id, v)}>
                  <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABELS[s as ContentStage]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-sm">{it.due_date ?? "—"}</TableCell>
              <TableCell className="space-x-1">
                {it.is_repurposed && <Badge variant="secondary">Repurposed</Badge>}
                {it.is_monetized && <Badge variant="secondary">Monetized</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => onEdit(it)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(it.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}