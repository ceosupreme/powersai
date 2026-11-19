import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import type { BrandProject } from "@/hooks/useContentProduction";
import { ContentPackageImportError, importContentPackage, type PackageImportSummary } from "@/lib/contentPackageImport";

const T = (name: string) => supabase.from(name as any) as any;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: BrandProject[];
  onDone: () => void;
}

export function ImportPackageDialog({ open, onOpenChange, projects, onDone }: Props) {
  const [projectId, setProjectId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<PackageImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setSummary(null); setError(null); };

  const handleFile = async (file: File) => {
    reset();
    if (!projectId) { setError("Choose a brand first."); return; }
    setBusy(true);
    try {
      const raw = JSON.parse(await file.text());
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const result = await importContentPackage(raw, { projectId, userId: data.user?.id ?? "", from: T });
      setSummary(result);
      onDone();
      toast.success(`Imported ${result.created.length} new records; updated ${result.updated.length} items`);
    } catch (e: unknown) {
      const partial = e instanceof ContentPackageImportError ? e.summary : null;
      if (partial) { setSummary(partial); onDone(); }
      const message = e instanceof Error ? e.message : "That file could not be read.";
      const hasSavedWork = partial && (partial.created.length > 0 || partial.updated.length > 0);
      setError(message + (hasSavedWork ? " Earlier records were saved. After fixing this issue, repeat the import to finish safely." : ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import package</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Pick the brand, then choose the package's asset-manifest.json. Repeat imports fill
            missing draft material and reuse files and placements while preserving your saved work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={busy}>
              <SelectTrigger><SelectValue placeholder="Choose a brand" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manifest">asset-manifest.json</Label>
            <Input
              id="manifest"
              type="file"
              accept="application/json,.json"
              disabled={busy || !projectId}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading the package…
            </div>
          )}

          {error && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">{error}</div>
          )}

          {summary && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Created ({summary.created.length})</div>
                {summary.created.length === 0 ? (
                  <p className="text-muted-foreground">Nothing new.</p>
                ) : (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {summary.created.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                )}
              </div>
              <div>
                <div className="font-medium">Updated ({summary.updated.length})</div>
                {summary.updated.length === 0 ? (
                  <p className="text-muted-foreground">No saved drafts changed.</p>
                ) : (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {summary.updated.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                )}
              </div>
              <div>
                <div className="font-medium">Skipped ({summary.skipped.length})</div>
                {summary.skipped.length === 0 ? (
                  <p className="text-muted-foreground">Nothing skipped.</p>
                ) : (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {summary.skipped.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <Upload className="h-4 w-4 mr-1" /> Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
