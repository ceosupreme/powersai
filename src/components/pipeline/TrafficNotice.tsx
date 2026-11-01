import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { trafficGaps, trafficNoticeText } from '@/lib/brandSetup';
import { useAssetMap, useTrafficAssets } from '@/hooks/useBrandSetup';

/** Warns (never blocks) when a monetization/promotion playbook needs an asset this brand has not set up. */
export function TrafficNotice({ projectId, methods }: { projectId: string; methods: { key: string; title: string }[] }) {
  const on = !!projectId && methods.length > 0;
  const assets = useTrafficAssets(on);
  const map = useAssetMap(projectId, on);
  if (!on || !assets.data || !map.data) return null;
  const gaps = trafficGaps(methods, assets.data, map.data);
  if (!gaps.length) return null;
  return (
    <div role="status" className="rounded-lg border border-border bg-muted/50 p-3 text-sm space-y-1.5">
      {gaps.map((g) => (
        <p key={g.key} className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />{trafficNoticeText(g)}</p>
      ))}
      <Link to={`/project/${projectId}?tab=setup`} className="text-xs underline text-primary">Open the Setup tab</Link>
    </div>
  );
}
