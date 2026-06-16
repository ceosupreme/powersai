import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  ChannelRevenue,
  REVENUE_TYPE_LABELS,
  formatMonth,
  formatUSD,
  useChannelRevenueMutations,
} from "@/hooks/useChannelRevenue";
import { toast } from "sonner";

interface Props {
  items: ChannelRevenue[];
  projectId: string;
  onEdit: (e: ChannelRevenue) => void;
}

export function RevenueTable({ items, projectId, onEdit }: Props) {
  const { remove } = useChannelRevenueMutations(projectId);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this revenue entry?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Entry deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No revenue entries yet. Add your first entry to start tracking.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap">{formatMonth(r.period_month)}</TableCell>
              <TableCell>
                <Badge variant="outline">{REVENUE_TYPE_LABELS[r.revenue_type] ?? r.revenue_type}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium">{formatUSD(Number(r.amount))}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                {r.source_note ?? "—"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}