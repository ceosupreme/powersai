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

const T = (name: string) => supabase.from(name as any) as any;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: BrandProject[];
  onDone: () => void;
}

type Summary = {
  created: string[];
  skipped: string[];
};

function pick<T>(...vals: (T | undefined | null)[]): T | null {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
  return null;
}

export function ImportPackageDialog({ open, onOpenChange, projects, onDone }: Props) {
  const [projectId, setProjectId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setSummary(null); setError(null); };

  const handleFile = async (file: File) => {
    reset();
    if (!projectId) { setError("Choose a brand first."); return; }
    setBusy(true);
    const created: string[] = [];
    const skipped: string[] = [];
    try {
      const raw = JSON.parse(await file.text());
      const src = raw.source ?? raw.article ?? {};
      const sourceTitle = pick<string>(src.title, raw.title);
      if (!sourceTitle) throw new Error("The manifest has no source article title.");
      const posts: any[] = raw.posts ?? raw.items ?? raw.deliverables ?? [];
      if (!Array.isArray(posts) || posts.length === 0) {
        throw new Error("The manifest lists no posts to create.");
      }

      // 1. Source (matched on title + project so a re-import reuses it)
      const { data: existingSource } = await T("content_sources")
        .select("id").eq("project_id", projectId).eq("title", sourceTitle).maybeSingle();
      let sourceId = existingSource?.id as string | undefined;
      if (sourceId) {
        skipped.push(`Source already existed: ${sourceTitle}`);
      } else {
        const { data, error } = await T("content_sources").insert({
          project_id: projectId,
          title: sourceTitle,
          source_type: pick<string>(src.source_type, src.type) ?? "article",
          url: pick<string>(src.url),
          summary: pick<string>(src.summary, src.description),
        }).select("id").single();
        if (error) throw error;
        sourceId = data.id;
        created.push(`Source: ${sourceTitle}`);
      }

      // 2. Family
      const famTitle = pick<string>(raw.family?.title, raw.package_name, sourceTitle)!;
      const { data: existingFam } = await T("content_families")
        .select("id").eq("project_id", projectId).eq("title", famTitle).maybeSingle();
      let familyId = existingFam?.id as string | undefined;
      if (familyId) {
        skipped.push(`Family already existed: ${famTitle}`);
      } else {
        const { data, error } = await T("content_families").insert({
          project_id: projectId,
          source_id: sourceId,
          title: famTitle,
          purpose: pick<string>(raw.family?.purpose, raw.purpose),
        }).select("id").single();
        if (error) throw error;
        familyId = data.id;
        created.push(`Family: ${famTitle}`);
      }

      // Brand kit for the asset rows
      const { data: kit } = await T("brand_kits")
        .select("id").eq("project_id", projectId).maybeSingle();
      let kitId = kit?.id as string | undefined;
      if (!kitId) {
        const { data: userRes } = await supabase.auth.getUser();
        const { data, error } = await T("brand_kits")
          .insert({ project_id: projectId, created_by: userRes.user?.id })
          .select("id").single();
        if (error) throw error;
        kitId = data.id;
      }

      // 3. One item per post, its files as assets, one draft placement
      for (const post of posts) {
        const title = pick<string>(post.title, post.name) ?? "Untitled post";
        const format = pick<string>(post.format, post.type) ?? "post";
        const channel = pick<string>(post.channel, post.platform) ?? "other";
        const idem = `import:${familyId}:${channel}:${title}`;

        const { data: existingItem } = await T("content_items")
          .select("id").eq("project_id", projectId).eq("family_id", familyId)
          .eq("title", title).maybeSingle();
        let itemId = existingItem?.id as string | undefined;
        if (itemId) {
          skipped.push(`Item already existed: ${title}`);
        } else {
          const { data: userRes } = await supabase.auth.getUser();
          const { data, error } = await T("content_items").insert({
            project_id: projectId,
            family_id: familyId,
            title,
            format,
            stage: pick<string>(post.stage) ?? "idea",
            purpose: pick<string>(post.purpose),
            recipe_version: pick<string>(post.recipe_version, raw.recipe_version),
            created_by: userRes.user?.id,
          }).select("id").single();
          if (error) throw error;
          itemId = data.id;
          created.push(`Item: ${title}`);
        }

        const files: any[] = post.files ?? post.assets ?? post.exports ?? post.slides ?? [];
        for (const f of files) {
          const fileName = pick<string>(f.file_name, f.name, f.path);
          const hash = pick<string>(f.content_hash, f.hash, f.sha256);
          if (!fileName) { skipped.push("A file entry had no name"); continue; }
          if (hash) {
            const { data: dupe } = await T("brand_kit_assets")
              .select("id").eq("content_hash", hash).maybeSingle();
            if (dupe?.id) { skipped.push(`File already stored: ${fileName}`); continue; }
          }
          const { error } = await T("brand_kit_assets").insert({
            kit_id: kitId,
            source_id: sourceId,
            storage_path: pick<string>(f.path, f.storage_path, fileName),
            file_name: fileName,
            mime_type: pick<string>(f.mime_type, f.mime),
            asset_type: pick<string>(f.asset_type) ?? (String(pick<string>(f.mime_type, f.mime) ?? "").startsWith("video") ? "video" : "image"),
            file_size: pick<number>(f.size, f.file_size),
            content_hash: hash,
            original_width: pick<number>(f.width, f.original_width),
            original_height: pick<number>(f.height, f.original_height),
            duration_seconds: pick<number>(f.duration_seconds, f.duration),
            description: pick<string>(f.description, f.alt_text),
            provenance: pick<string>(f.provenance),
          });
          if (error) { skipped.push(`File failed: ${fileName} — ${error.message}`); continue; }
          created.push(`File: ${fileName}`);
        }

        const { data: existingPlacement } = await T("content_placements")
          .select("id").eq("idempotency_key", idem).maybeSingle();
        if (existingPlacement?.id) {
          skipped.push(`Placement already existed: ${channel} — ${title}`);
        } else {
          const { error } = await T("content_placements").insert({
            content_item_id: itemId,
            project_id: projectId,
            channel,
            account_label: pick<string>(post.account_label, post.account),
            status: "draft",
            idempotency_key: idem,
          });
          if (error) skipped.push(`Placement failed: ${channel} — ${error.message}`);
          else created.push(`Placement: ${channel} — ${title}`);
        }
      }

      setSummary({ created, skipped });
      onDone();
      toast.success(`Imported ${created.length} new records`);
    } catch (e: any) {
      setError(e?.message ?? "That file could not be read.");
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
            Pick the brand, then choose the package's asset-manifest.json. A repeat import of the
            same package adds nothing twice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select value={projectId} onValueChange={setProjectId}>
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
