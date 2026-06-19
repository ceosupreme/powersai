import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ServiceOffer,
  useServiceOffers,
  useServiceOfferMutations,
} from "@/hooks/useServiceOffers";
import { ServiceOfferDialog } from "@/components/offers/ServiceOfferDialog";
import { toast } from "sonner";

export default function OffersPage() {
  const { data: items = [], isLoading } = useServiceOffers();
  const { remove } = useServiceOfferMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOffer | null>(null);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const fmtPrice = (n: number | null) => (n == null ? "—" : `$${Number(n).toLocaleString()}`);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offers</h1>
          <p className="text-sm text-muted-foreground">Your service library — used by Client Acquisition AI to match leads.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Offer
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Who it's for</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Starter</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No offers yet.</TableCell></TableRow>
            ) : (
              items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{o.who_its_for || "—"}</TableCell>
                  <TableCell>{o.timeline || "—"}</TableCell>
                  <TableCell>{fmtPrice(o.starter_price)}</TableCell>
                  <TableCell>{fmtPrice(o.premium_price)}</TableCell>
                  <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(o.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ServiceOfferDialog open={open} onOpenChange={setOpen} offer={editing} />
    </div>
  );
}