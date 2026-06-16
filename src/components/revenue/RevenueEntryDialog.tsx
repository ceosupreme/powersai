import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChannelRevenue,
  REVENUE_TYPES,
  REVENUE_TYPE_LABELS,
  monthToFirstDay,
  useChannelRevenueMutations,
} from "@/hooks/useChannelRevenue";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string | null | undefined;
  entry?: ChannelRevenue | null;
}

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const empty = {
  revenue_type: "ad",
  amount: "",
  period_month: currentMonth(),
  source_note: "",
};

export function RevenueEntryDialog({ open, onOpenChange, projectId, entry }: Props) {
  const { create, update } = useChannelRevenueMutations(projectId);
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (entry) {
      setForm({
        revenue_type: entry.revenue_type,
        amount: String(entry.amount ?? ""),
        period_month: entry.period_month?.slice(0, 7) ?? currentMonth(),
        source_note: entry.source_note ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [entry, open]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    const amt = parseFloat(form.amount);
    if (!form.revenue_type) return toast.error("Revenue type required");
    if (!isFinite(amt)) return toast.error("Amount must be a number");
    if (!form.period_month) return toast.error("Month required");
    const payload: any = {
      revenue_type: form.revenue_type,
      amount: amt,
      period_month: monthToFirstDay(form.period_month),
      source_note: form.source_note?.trim() || null,
    };
    try {
      if (entry) {
        await update.mutateAsync({ id: entry.id, patch: payload });
        toast.success("Revenue entry updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Revenue entry added");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Revenue Entry" : "New Revenue Entry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={form.revenue_type} onValueChange={(v) => set("revenue_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVENUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{REVENUE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
            <div>
              <Label>Month</Label>
              <Input
                type="month"
                value={form.period_month}
                onChange={(e) => set("period_month", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Source Note</Label>
            <Textarea
              rows={2}
              placeholder="e.g. AdSense payout, sponsor name, course launch…"
              value={form.source_note}
              onChange={(e) => set("source_note", e.target.value)}
            />
          </div>
          <div>
            <Label>Linked Product</Label>
            <Input disabled placeholder="Linked products coming soon" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={create.isPending || update.isPending}>
            {entry ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}