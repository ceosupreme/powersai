import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AffiliateProgram,
  useAffiliatePrograms,
  useAffiliateProgramMutations,
} from "@/hooks/useAffiliatePrograms";
import { AffiliateProgramDialog } from "@/components/affiliate/AffiliateProgramDialog";
import { toast } from "sonner";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

export default function AffiliateProgramsPage() {
  const { data: items = [], isLoading } = useAffiliatePrograms();
  const { remove } = useAffiliateProgramMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AffiliateProgram | null>(null);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    try {
      await remove.mutateAsync(id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Affiliate Programs</h1>
          <p className="text-sm text-muted-foreground">Shared library across all channels</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Program
        </Button>
      </div>

      <HelpTip helpKey={HELP_KEYS.affiliatePrograms} title="Account-wide library">
        Affiliate Programs is one of two account-wide libraries (the other is Products). Unlike
        most pages, switching projects does NOT change what shows here — build the catalog once
        and reference it from any project's content, campaigns, or revenue entries.
      </HelpTip>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Niche</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No affiliate programs yet.</TableCell></TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.niche || "—"}</TableCell>
                  <TableCell>
                    {p.commission_type || p.commission_detail
                      ? `${p.commission_type ?? ""}${p.commission_detail ? ` · ${p.commission_detail}` : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell>{p.status ? <Badge variant="outline">{p.status}</Badge> : "—"}</TableCell>
                  <TableCell>
                    {p.link ? (
                      <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)}>
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

      <AffiliateProgramDialog open={open} onOpenChange={setOpen} program={editing} />
    </div>
  );
}