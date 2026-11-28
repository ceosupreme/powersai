import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { type RunState, validLiveUrl } from '@/lib/productRun';

export type ProductOutlet = { outlet: string; stage: string; primary: boolean; twin: boolean; optional?: boolean };
const text = (v: unknown) => typeof v === 'string' ? v : '';
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function ProductUploadKit({ state, outlets, busy, saveLink, onClose }: { state: RunState; outlets: ProductOutlet[]; busy: boolean; saveLink: (o: ProductOutlet, url: string) => Promise<void>; onClose: () => void }) {
  const kit = state.product_template.recipe.upload_kit;
  const [links, setLinks] = useState<Record<string, string>>(state.listings ?? {});
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast.success('Copied'); } catch { toast.error('Copy was unavailable. Select the text to copy it.'); } };
  const fields = Array.isArray(kit.fields) ? kit.fields.map(object) : [];
  const buttons = Array.isArray(kit.links) ? kit.links.map(object) : [];
  const ai = state.upload_kit?.ai_answer;
  return <Sheet open onOpenChange={v => { if (!v) onClose(); }}><SheetContent side="bottom" className="h-[94dvh] overflow-y-auto px-4 pb-8"><div className="mx-auto max-w-2xl space-y-6">
    <SheetHeader className="text-left"><SheetTitle>Upload kit</SheetTitle><SheetDescription>Saved text and live links for this product.</SheetDescription></SheetHeader>
    <div className="grid gap-3">{buttons.map((l, i) => validLiveUrl(l.url) && <Button key={i} asChild variant="outline" className="min-h-12 h-auto whitespace-normal justify-between text-left"><a href={l.url} target="_blank" rel="noopener noreferrer">{text(l.label)}<ExternalLink className="ml-2 h-4 w-4 shrink-0" /></a></Button>)}</div>
    <div className="space-y-5">{fields.map((f, i) => {
      const key = `${text(f.page)}::${text(f.field)}`; const value = state.upload_kit?.fields?.[key] ?? '';
      return <section key={`${key}:${i}`} className="space-y-2 border-b pb-4">
        <p className="text-xs text-muted-foreground">{text(f.page)}</p><div className="flex items-start justify-between gap-3"><h3 className="font-medium break-words">{text(f.field)}</h3><Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label={`Copy ${text(f.field)}`} title={`Copy ${text(f.field)}`} disabled={!value.trim()} onClick={() => copy(value)}><Copy className="h-4 w-4" /></Button></div>
        <p className={value.trim() ? 'whitespace-pre-wrap break-words text-sm' : 'text-sm text-destructive'}>{value.trim() ? value : 'Not written yet'}</p>
        <p className="text-xs text-muted-foreground">{text(f.what_to_paste)}</p>{!!f.limit && <p className="text-xs text-muted-foreground">{text(f.limit)}</p>}
      </section>;
    })}</div>
    {!!kit.ai_question && <section className="space-y-2 border-b pb-4"><h3 className="font-medium">AI question answer</h3><p className={ai ? 'text-sm whitespace-pre-wrap' : 'text-sm text-destructive'}>{ai || 'Not written yet'}</p><p className="text-xs text-muted-foreground">{text(object(kit.ai_question).how_to_answer)}</p>{ai && <Button variant="outline" onClick={() => copy(ai)}><Copy className="mr-2 h-4 w-4" />Copy answer</Button>}</section>}
    <section className="space-y-4"><h3 className="text-lg font-semibold">Live links</h3>{outlets.map(o => <div key={o.outlet} className="space-y-2"><Label htmlFor={`live-${o.outlet}`}>{o.outlet}{o.optional ? ' (optional)' : ''}</Label><Input id={`live-${o.outlet}`} inputMode="url" placeholder="https://" value={links[o.outlet] ?? ''} onChange={e => setLinks(v => ({ ...v, [o.outlet]: e.target.value }))} /><Button className="min-h-11 w-full" variant="outline" disabled={busy || !validLiveUrl(links[o.outlet])} onClick={() => saveLink(o, links[o.outlet] ?? '')}>{state.listings?.[o.outlet] ? 'Update live link' : 'Save live link'}</Button></div>)}</section>
  </div></SheetContent></Sheet>;
}