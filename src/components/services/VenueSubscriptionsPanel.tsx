import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import {
  useVenueSubscriptions, useVenueSubscriptionMutations,
  type VenueSubscription,
} from "@/hooks/useVenueSubscriptions";
import { useServicePackages, type ServicePackage } from "@/hooks/useServicePackages";

function fmtMoney(n: number | null, ccy: string) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n);
  } catch { return `$${n}`; }
}

export function VenueSubscriptionsPanel({ venueId }: { venueId: string }) {
  const { data: subs = [], isLoading } = useVenueSubscriptions(venueId);
  const { data: pkgs = [] } = useServicePackages({ activeOnly: true });
  const m = useVenueSubscriptionMutations(venueId);
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Current packages</h4>
          <p className="text-xs text-muted-foreground">
            What this client is on. Multiple active allowed (core + add-ons).
          </p>
        </div>
        <Button size="sm" onClick={() => setAssignOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Assign package
        </Button>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!isLoading && subs.length === 0 && (
        <p className="text-xs text-muted-foreground">No packages assigned yet.</p>
      )}

      <div className="space-y-2">
        {subs.map((s) => <SubscriptionRow key={s.id} sub={s} m={m} />)}
      </div>

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        packages={pkgs}
        onAssign={async (input) => {
          try {
            await m.assign.mutateAsync(input);
            toast.success("Package assigned");
            setAssignOpen(false);
          } catch (e: any) {
            toast.error(e.message ?? "Failed");
          }
        }}
      />
    </div>
  );
}

function SubscriptionRow({
  sub, m,
}: {
  sub: VenueSubscription;
  m: ReturnType<typeof useVenueSubscriptionMutations>;
}) {
  const statusColor =
    sub.status === "active" ? "default"
    : sub.status === "paused" ? "secondary"
    : "outline";
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{sub.package?.name ?? "Unknown package"}</span>
            {sub.package?.tier && <Badge variant="outline" className="text-xs">{sub.package.tier}</Badge>}
            <Badge variant={statusColor as any} className="text-xs">{sub.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {fmtMoney(sub.one_time_price_agreed, sub.currency)} one-time ·{" "}
            {fmtMoney(sub.monthly_price_agreed, sub.currency)}/mo · started{" "}
            {new Date(sub.started_at).toLocaleDateString()}
            {sub.ended_at && ` · ended ${new Date(sub.ended_at).toLocaleDateString()}`}
          </div>
          {sub.notes && <div className="text-xs">{sub.notes}</div>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sub.status !== "active" && (
              <DropdownMenuItem onClick={() => m.setStatus.mutate({ id: sub.id, status: "active" })}>
                Resume
              </DropdownMenuItem>
            )}
            {sub.status === "active" && (
              <DropdownMenuItem onClick={() => m.setStatus.mutate({ id: sub.id, status: "paused" })}>
                Pause
              </DropdownMenuItem>
            )}
            {sub.status !== "ended" && (
              <DropdownMenuItem onClick={() => m.setStatus.mutate({ id: sub.id, status: "ended" })}>
                End
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm("Delete this subscription row? This cannot be undone.")) {
                  m.remove.mutate(sub.id);
                }
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

function AssignDialog({
  open, onOpenChange, packages, onAssign,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  packages: ServicePackage[];
  onAssign: (input: {
    package_id: string;
    one_time_price_agreed: number | null;
    monthly_price_agreed: number | null;
    currency: string;
    notes: string | null;
  }) => Promise<void>;
}) {
  const [pkgId, setPkgId] = useState<string>("");
  const [oneTime, setOneTime] = useState<string>("");
  const [monthly, setMonthly] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [notes, setNotes] = useState("");

  const selected = useMemo(() => packages.find((p) => p.id === pkgId) ?? null, [packages, pkgId]);

  const pickPackage = (id: string) => {
    setPkgId(id);
    const p = packages.find((x) => x.id === id);
    if (p) {
      setOneTime(String(p.one_time_price ?? 0));
      setMonthly(String(p.monthly_price ?? 0));
      setCurrency(p.currency ?? "USD");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign package</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Package</Label>
            <Select value={pkgId} onValueChange={pickPackage}>
              <SelectTrigger><SelectValue placeholder="Select a package" /></SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.tier ? `${p.tier} · ` : ""}{p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected?.price_note && (
              <p className="text-xs text-muted-foreground">{selected.price_note}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>One-time</Label>
              <Input type="number" value={oneTime} onChange={(e) => setOneTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Monthly</Label>
              <Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={!pkgId}
              onClick={() => onAssign({
                package_id: pkgId,
                one_time_price_agreed: oneTime === "" ? null : Number(oneTime),
                monthly_price_agreed: monthly === "" ? null : Number(monthly),
                currency: currency || "USD",
                notes: notes.trim() || null,
              })}
            >Assign</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}