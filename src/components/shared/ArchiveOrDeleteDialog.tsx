import { useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * One line per real linked relationship. OMIT a line entirely when the
 * relationship doesn't exist on the entity — never render "0" as a stand-in,
 * that misleads the user about cascade behavior.
 *
 *  - effect: "destroyed" → the linked rows will be CASCADE-deleted
 *  - effect: "unlinked"  → the linked rows survive but their FK becomes NULL
 */
export type LinkedLine = { count: number; label: string; effect: "destroyed" | "unlinked" };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;        // "company", "contact", "deal", "brand kit"
  entityName: string;         // e.g. "Acme Corp"
  linkedLines?: LinkedLine[]; // omit lines that don't apply
  extraNote?: string;         // e.g. "Storage files are kept separately."
  allowArchive?: boolean;     // default true; set false if already archived
  onArchive?: (reason?: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
};

export function ArchiveOrDeleteDialog({
  open, onOpenChange, entityLabel, entityName,
  linkedLines = [], extraNote, allowArchive = true, onArchive, onDelete,
}: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<null | "archive" | "delete">(null);

  const destroyedLines = linkedLines.filter((l) => l.effect === "destroyed" && l.count > 0);
  const unlinkedLines = linkedLines.filter((l) => l.effect === "unlinked" && l.count > 0);

  const fmt = (lines: LinkedLine[]) =>
    lines.map((l) => `${l.count} ${l.label}${l.count === 1 ? "" : ""}`).join(", ");

  const close = () => { setReason(""); setBusy(null); onOpenChange(false); };

  const handle = async (kind: "archive" | "delete") => {
    setBusy(kind);
    try {
      if (kind === "archive" && onArchive) await onArchive(reason.trim() || undefined);
      else await onDelete();
      close();
    } finally {
      setBusy(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) close(); else onOpenChange(true); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {allowArchive ? `Archive or delete ${entityLabel}` : `Delete ${entityLabel}`} "{entityName}"?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {allowArchive && (
                <p>
                  <span className="font-medium text-foreground">Archive</span> hides this {entityLabel} from your
                  default views but keeps it (and everything linked to it) intact. You can restore it any time.
                </p>
              )}
              {(destroyedLines.length > 0 || unlinkedLines.length > 0) && (
                <div className="rounded border border-destructive/30 bg-destructive/5 p-2 space-y-1">
                  <div className="font-medium text-destructive">If you delete permanently:</div>
                  {destroyedLines.length > 0 && (
                    <div>{fmt(destroyedLines)} will be <span className="font-medium">permanently deleted</span>.</div>
                  )}
                  {unlinkedLines.length > 0 && (
                    <div>{fmt(unlinkedLines)} will be <span className="font-medium">unlinked but kept</span>.</div>
                  )}
                </div>
              )}
              {extraNote && <p className="text-muted-foreground">{extraNote}</p>}
              {allowArchive && (
                <div className="pt-2 space-y-1">
                  <Label htmlFor="archive-reason" className="text-xs">Reason (optional)</Label>
                  <Input id="archive-reason" value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. lost to competitor, paused outreach" />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={busy !== null}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={busy !== null} onClick={() => handle("delete")}>
            {busy === "delete" ? "Deleting…" : "Delete permanently"}
          </Button>
          {allowArchive && (
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handle("archive"); }} disabled={busy !== null}>
              {busy === "archive" ? "Archiving…" : "Archive (recommended)"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}