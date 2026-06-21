import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Package } from "lucide-react";
import { useAutomationBundles, useApplyBundle, type AutomationBundle } from "@/hooks/useAutomationBundles";
import { useAutomationEnrollments } from "@/hooks/useAutomationEnrollments";
import { supabase } from "@/integrations/supabase/client";

interface Props { projectId: string }

export function ApplyBundleControl({ projectId }: Props) {
  const { data: bundles = [], isLoading } = useAutomationBundles();
  const { data: enrollments = [] } = useAutomationEnrollments(projectId);
  const apply = useApplyBundle();
  const [selected, setSelected] = useState<string>("");
  const [projectType, setProjectType] = useState<string | null>(null);
  const [projectTier, setProjectTier] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("venues")
        .select("project_type, package_tier, tier")
        .eq("id", projectId)
        .maybeSingle();
      if (cancelled || !data) return;
      setProjectType(data.project_type ?? null);
      setProjectTier(data.package_tier ?? data.tier ?? null);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const sorted = useMemo(() => {
    const isSuggested = (b: AutomationBundle) =>
      (!!projectType && b.project_type === projectType) ||
      (!!projectTier && b.tier === projectTier);
    return [...bundles].sort((a, b) => {
      const sa = isSuggested(a) ? 0 : 1;
      const sb = isSuggested(b) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return a.sort_order - b.sort_order;
    });
  }, [bundles, projectType, projectTier]);

  const selectedBundle = bundles.find((b) => b.id === selected);
  const existingKeys = new Set(enrollments.map((e) => e.automation_key));
  const conflicts = (selectedBundle?.items ?? []).filter((i) => existingKeys.has(i.automation_key));

  const run = async (overwrite: "skip" | "replace") => {
    if (!selected) return;
    try {
      const r = await apply.mutateAsync({
        project_id: projectId,
        bundle_id: selected,
        overwrite,
      });
      const parts: string[] = [];
      if (r.created.length) parts.push(`${r.created.length} added`);
      if (r.replaced.length) parts.push(`${r.replaced.length} replaced`);
      if (r.skipped.length) parts.push(`${r.skipped.length} kept`);
      toast.success(`Bundle applied — ${parts.join(", ") || "no changes"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply bundle");
    } finally {
      setConflictOpen(false);
    }
  };

  const onApplyClick = () => {
    if (!selected) return;
    if (conflicts.length > 0) { setConflictOpen(true); return; }
    run("skip");
  };

  const isSuggested = (b: AutomationBundle) =>
    (!!projectType && b.project_type === projectType) ||
    (!!projectTier && b.tier === projectTier);

  return (
    <Card className="p-4 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <h4 className="font-medium text-sm">Apply a bundle</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Apply a pre-configured set of automations in one step. Existing customized
        automations are kept by default.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[220px] space-y-1">
          <Label className="text-xs">Bundle</Label>
          <Select value={selected} onValueChange={setSelected} disabled={isLoading}>
            <SelectTrigger><SelectValue placeholder={isLoading ? "Loading…" : "Pick a bundle"} /></SelectTrigger>
            <SelectContent>
              {sorted.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}{isSuggested(b) ? " · suggested" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onApplyClick} disabled={!selected || apply.isPending}>
          {apply.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Apply
        </Button>
      </div>
      {selectedBundle && (
        <div className="text-xs text-muted-foreground space-y-1">
          {selectedBundle.description && <p>{selectedBundle.description}</p>}
          <div className="flex flex-wrap gap-1">
            {(selectedBundle.items ?? []).map((i) => (
              <Badge key={i.automation_key} variant="secondary" className="text-[10px]">
                {i.automation_key}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing automations detected</AlertDialogTitle>
            <AlertDialogDescription>
              This project already has these automations configured:{" "}
              <strong>{conflicts.map((c) => c.automation_key).join(", ")}</strong>.
              Keep the existing configs (recommended) or replace them with this bundle's defaults?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => run("skip")} disabled={apply.isPending}>
              Keep existing
            </Button>
            <AlertDialogAction onClick={() => run("replace")} disabled={apply.isPending}>
              Replace with defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}