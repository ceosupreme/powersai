import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { BoardItem } from '@/hooks/useContentProduction';

const CONTENT_FIELDS: { key: string; label: string }[] = [
  { key: 'script', label: 'Script' }, { key: 'script_text', label: 'Script' },
  { key: 'caption', label: 'Caption' }, { key: 'copy', label: 'Copy' },
  { key: 'hook', label: 'Hook' }, { key: 'brief', label: 'Creative brief' },
  { key: 'cta', label: 'Call to action' }, { key: 'notes', label: 'Notes' },
  { key: 'primary_keyword', label: 'Main keyword' },
];

function printable(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

/** Open a post and its actual saved material rather than a non-clickable status card. */
export function ContentDetailsDialog({ item, onClose }: { item: BoardItem | null; onClose: () => void }) {
  const details = useQuery({
    queryKey: ['content-details', item?.project_id, item?.id],
    enabled: !!item,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('content_items')
        .select('*').eq('id', item!.id).eq('project_id', item!.project_id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This post is unavailable for your brand.');
      return data as Record<string, unknown>;
    },
  });
  const fields = CONTENT_FIELDS.map((field) => ({
    ...field, value: printable(details.data?.[field.key]),
  })).filter((field) => field.value.trim());
  return <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{item?.title || 'Post details'}</DialogTitle>
        <DialogDescription>Current HQ stage: {item?.stage}. A stage alone is not proof of external publication.</DialogDescription>
      </DialogHeader>
      {details.isLoading ? <p className="text-sm">Opening the saved post…</p> :
        details.isError ? <p role="alert" className="text-sm text-destructive">{(details.error as Error)?.message}</p> :
        <div className="space-y-4">
          {fields.length === 0 ? <p className="text-sm text-muted-foreground">No script, caption or brief is stored on this post yet.</p> :
            fields.map((field) => <section key={field.key} className="space-y-1">
              <h3 className="text-sm font-semibold">{field.label}</h3>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{field.value}</p>
            </section>)}
          {item?.placements?.length ? <section className="border-t pt-3 space-y-2">
            <h3 className="font-semibold text-sm">Platforms and placements</h3>
            {item.placements.map((place) => <div key={place.id} className="text-sm rounded-md border p-3">
              <p>{place.channel}{place.account_label ? ` · ${place.account_label}` : ''}</p>
              <p className="text-xs text-muted-foreground">{place.status}{place.scheduled_for ? ` · ${new Date(place.scheduled_for).toLocaleString()}` : ''}</p>
              {safeUrl(place.live_url) && <a href={safeUrl(place.live_url)!} target="_blank" rel="noreferrer" className="text-primary underline">Open live post</a>}
            </div>)}
          </section> : null}
        </div>}
      {item && <Button asChild variant="outline"><Link to={`/content?open=${item.id}`} onClick={onClose}>Edit post in the content pipeline</Link></Button>}
    </DialogContent>
  </Dialog>;
}
