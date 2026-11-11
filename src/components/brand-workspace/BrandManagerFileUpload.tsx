import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileUp, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useBrandKitData, useUploadAsset } from '@/hooks/useBrandKit';
import { Button } from '@/components/ui/button';

/**
 * Focused brand-manager upload control. The selected project comes from the
 * assigned-brand portal, not the global admin project selector. Supabase
 * storage/object RLS and brand_kit_assets RLS enforce project access.
 *
 * No delete/archive capability is exposed here. Large raw video production
 * files can continue to use the brand's shared Drive link.
 */
export function BrandManagerFileUpload({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { kitQuery, kitId, ensureKit } = useBrandKitData(projectId);
  const upload = useUploadAsset(projectId, kitId);
  const [filePurpose, setFilePurpose] = useState<'image' | 'logo'>('image');
  const [busy, setBusy] = useState(false);

  const createSpace = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await ensureKit();
      await qc.invalidateQueries({ queryKey: ['brand-workspace', 'assets', projectId] });
      toast.success('Your brand file space is ready.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create the brand file space.');
    } finally { setBusy(false); }
  };

  const addFiles = async (files: File[]) => {
    if (!kitId || busy || files.length === 0) return;
    setBusy(true);
    let completed = 0;
    try {
      for (const file of files) {
        await upload.mutateAsync({
          file,
          assetType: filePurpose === 'logo' && file.type.startsWith('image/')
            ? 'logo'
            : file.type.startsWith('image/') ? 'image' : 'file',
        });
        completed++;
      }
      await qc.invalidateQueries({ queryKey: ['brand-workspace', 'assets', projectId] });
      toast.success(completed === 1 ? 'File added to this brand.' : `${completed} files added to this brand.`);
    } catch (e: any) {
      toast.error(completed > 0
        ? `${completed} file(s) saved; a later upload failed. ${e?.message ?? ''}`
        : e?.message ?? 'Could not upload the files.');
      await qc.invalidateQueries({ queryKey: ['brand-workspace', 'assets', projectId] });
    } finally { setBusy(false); }
  };

  return <div className="rounded-lg border p-4 space-y-3">
    <div className="flex items-start gap-2">
      <FileUp className="h-5 w-5 text-primary shrink-0" />
      <div>
        <h3 className="font-semibold">Add brand files</h3>
        <p className="text-xs text-muted-foreground">
          Upload a logo, image or document to this brand. Your files stay attached to its own workspace.
        </p>
      </div>
    </div>
    {kitQuery.isLoading ? <p className="text-sm text-muted-foreground">Checking brand files…</p> :
      kitQuery.isError ? <div className="space-y-2">
        <p role="alert" className="text-sm text-destructive">The brand's file space could not be opened.</p>
        <Button size="sm" variant="outline" onClick={() => void kitQuery.refetch()}>Try again</Button>
      </div> : !kitId ?
      <Button size="sm" variant="outline" disabled={busy} onClick={createSpace}>
        <FolderPlus className="h-4 w-4 mr-1"/>Create this brand's file space
      </Button> :
      <div className="space-y-2">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          File purpose
          <select className="rounded-md border bg-background px-3 py-2"
            value={filePurpose} disabled={busy} onChange={e => setFilePurpose(e.target.value as 'logo' | 'image')}>
            <option value="image">Photo or other file</option>
            <option value="logo">Brand logo</option>
          </select>
        </label>
        <label className="block rounded-md border-2 border-dashed p-4 text-center cursor-pointer hover:border-primary">
          <input type="file" multiple className="sr-only" disabled={busy}
            onChange={e => {
              const items = Array.from(e.currentTarget.files ?? []);
              e.currentTarget.value = '';
              void addFiles(items);
            }}/>
          <span className="text-sm text-primary">{busy ? 'Uploading…' : 'Select files to upload'}</span>
        </label>
        <p className="text-xs text-muted-foreground">For large raw video files, use the shared Drive workspace link below.</p>
      </div>}
  </div>;
}
