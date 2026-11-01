import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SOURCE_KINDS, SHELVES, isHiddenPlaybook } from '@/lib/playbookStatus';
import { keyOf, useAddPlaybookSource, type PlaybookRow } from '@/hooks/usePlaybooks';

export const SAVED_LINE = 'Saved. Claude merges it on the next run (Mondays and Thursdays).';
export const INBOX_URL = 'https://drive.google.com/drive/folders/1boqsx8ccAQdjBtF_x0EhBqWPjbRkqw2O';

const shelfOf = (sub: string | null) => SHELVES.find((s) => (s.subs as readonly string[]).includes(sub ?? ''))?.label ?? '';

/** fixed: saving from inside a playbook. library: picker options when opened from the top of the page. */
export function AddMaterialDialog({ open, onClose, fixed, library }: {
  open: boolean; onClose: () => void; fixed?: PlaybookRow | null; library?: PlaybookRow[];
}) {
  const add = useAddPlaybookSource();
  const [kind, setKind] = useState('owner_note');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [pickQ, setPickQ] = useState('');
  const [picked, setPicked] = useState<PlaybookRow | null>(null);
  const [saved, setSaved] = useState(false);

  const options = useMemo(() => {
    const q = pickQ.trim().toLowerCase();
    return (library ?? []).filter((r) => !isHiddenPlaybook(r) && (!q || r.title.toLowerCase().includes(q))).slice(0, 30);
  }, [library, pickQ]);

  const reset = () => { setKind('owner_note'); setTitle(''); setUrl(''); setContent(''); setPickQ(''); setPicked(null); setSaved(false); };
  const close = () => { reset(); onClose(); };

  const target = fixed ?? picked;
  const save = async () => {
    if (!title.trim()) return;
    try {
      const k = target ? keyOf(target) : null;
      await add.mutateAsync({
        kind, title: title.trim(), url: url.trim() || null, content: content.trim() || null,
        playbook_id: target?.id ?? null, suggested_keys: k ? [k] : [],
      });
      setSaved(true);
    } catch (e: any) { toast.error(e?.message ?? 'Could not save your material'); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !add.isPending && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add your material</DialogTitle>
          <DialogDescription>{fixed ? `For: ${fixed.title}` : 'Research, videos, notes or anything Claude should learn from.'}</DialogDescription>
        </DialogHeader>
        {saved ? (
          <div className="space-y-4">
            <p role="status" className="rounded-md border border-signal-green/50 bg-signal-green/10 p-3 text-sm">{SAVED_LINE}</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={reset}>Add another</Button>
              <Button onClick={close}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-title">Title (required)</Label>
                <Input id="am-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-url">Link (optional)</Label>
                <Input id="am-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="am-content">Notes or pasted text (optional)</Label>
                <Textarea id="am-content" rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
              </div>
              {!fixed && (
                <div className="space-y-1.5">
                  <Label htmlFor="am-pick">Playbook (optional)</Label>
                  <p className="text-xs text-muted-foreground">Not sure? Leave it blank and Claude will route it.</p>
                  {picked ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-primary p-2 text-sm">
                      <span className="min-w-0 break-words">Chosen: {picked.title}</span>
                      <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>Clear</Button>
                    </div>
                  ) : (
                    <>
                      <Input id="am-pick" value={pickQ} onChange={(e) => setPickQ(e.target.value)} placeholder="Search all shelves" />
                      <ul className="max-h-48 overflow-y-auto divide-y divide-border rounded-md border border-border">
                        {options.map((r) => (
                          <li key={r.id}>
                            <button type="button" onClick={() => setPicked(r)} className={cn('w-full p-2 text-left text-sm hover:bg-muted/40')}>
                              {r.title} <span className="text-xs text-muted-foreground">· {shelfOf(r.subcategory)}</span>
                            </button>
                          </li>
                        ))}
                        {options.length === 0 && <li className="p-2 text-xs text-muted-foreground">No match.</li>}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={close} disabled={add.isPending}>Cancel</Button>
              <Button onClick={save} disabled={add.isPending || !title.trim()}>
                {add.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
