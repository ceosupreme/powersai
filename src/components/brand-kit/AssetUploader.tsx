import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, Trash2, FileIcon, ImageIcon } from 'lucide-react';
import { BrandAsset, getSignedUrl, useUploadAsset, useDeleteAsset } from '@/hooks/useBrandKit';

function fmtBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function AssetThumb({ asset }: { asset: BrandAsset }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    if (asset.mime_type?.startsWith('image/')) {
      getSignedUrl(asset.storage_path).then((u) => mounted && setUrl(u));
    }
    return () => { mounted = false; };
  }, [asset.id, asset.storage_path, asset.asset_type]);

  if (asset.mime_type?.startsWith('image/') && url) {
    return <img src={url} alt={asset.file_name} className="w-full h-32 object-cover rounded-md bg-muted" />;
  }
  return (
    <div className="w-full h-32 rounded-md bg-muted flex items-center justify-center">
      {asset.mime_type?.startsWith('image/') ? <ImageIcon className="h-8 w-8 text-muted-foreground" /> : <FileIcon className="h-8 w-8 text-muted-foreground" />}
    </div>
  );
}

export function AssetUploader({
  projectId, kitId, assets,
}: { projectId: string; kitId: string; assets: BrandAsset[] }) {
  const upload = useUploadAsset(projectId, kitId);
  const del = useDeleteAsset(kitId);
  const qc = useQueryClient();
  const [assetType, setAssetType] = useState('image');

  const onPick = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => upload.mutate({ file: f, assetType: assetType === "logo" ? "logo" : f.type.startsWith("image/") ? "image" : "file" }));
  };

  const handleDownload = async (asset: BrandAsset) => {
    const url = await getSignedUrl(asset.storage_path);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = asset.file_name; a.target = '_blank';
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm">Asset purpose
        <select className="ml-2 rounded border bg-background p-2" value={assetType} onChange={(e) => setAssetType(e.target.value)}><option value="image">Photo or file</option><option value="logo">Brand logo</option></select>
      </label>
      <label className="block">
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {upload.isPending ? 'Uploading…' : 'Click to upload logos, icons, or photos'}
          </p>
        </div>
      </label>

      {assets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((a) => (
            <Card key={a.id} className="p-2 space-y-2">
              <AssetThumb asset={a} />
              <div className="text-xs truncate" title={a.file_name}>{a.file_name}</div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="uppercase">{a.mime_type?.split('/')[1] ?? a.asset_type}</span>
                <span>{fmtBytes(a.file_size)}</span>
              </div>
              <Button variant="ghost" size="sm" disabled={a.asset_type === 'logo'} onClick={async () => {
                const { data, error } = await supabase.from('brand_kit_assets')
                  .update({ asset_type: 'logo' }).eq('id', a.id).eq('kit_id', kitId)
                  .select('id').maybeSingle();
                if (error || !data) return toast.error(error?.message ?? 'The file could not be marked as a logo. Check your access.');
                await qc.invalidateQueries({ queryKey: ['brand-assets', kitId] });
                toast.success('Marked as logo. Refresh the foundation audit to update its check.');
              }}>{a.asset_type === 'logo' ? 'Brand logo' : 'Use as logo'}</Button>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="flex-1 h-7" onClick={() => handleDownload(a)}>
                  <Download className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-7" onClick={() => del.mutate(a)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}