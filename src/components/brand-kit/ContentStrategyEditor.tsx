import { useState } from 'react';
import { useSaveKit, type BrandKit } from '@/hooks/useBrandKit';
import { PURPOSE_TYPES } from '@/hooks/useContentProduction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
export function ContentStrategyEditor({projectId, kit}: {projectId: string; kit: BrandKit | null}) {
  const save = useSaveKit(projectId);
  const [pillars, setPillars] = useState((kit?.content_pillars ?? []).join('\n'));
  const [mix, setMix] = useState<Record<string, number>>(kit?.mix_targets ?? {});
  const keys = [...new Set([...PURPOSE_TYPES, ...Object.keys(mix)])];
  const total = Object.values(mix).reduce((a,b) => a + Number(b || 0), 0);
  return <div className="space-y-3 pt-3">
    <Label htmlFor="content-pillars">Content pillars (one per line)</Label>
    <Textarea id="content-pillars" value={pillars} onChange={e => setPillars(e.target.value)} />
    <p className="text-sm font-medium">Content mix · {total}% of 100%</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{keys.map(key => <div key={key}>
      <Label htmlFor={`mix-${key}`} className="capitalize">{key}</Label>
      <Input id={`mix-${key}`} type="number" min="0" max="100" step="1" value={mix[key] ?? ''} onChange={e => setMix({...mix, [key]:Number(e.target.value)})} />
    </div>)}</div>
    <p className="text-xs text-muted-foreground">Use 100% for a complete mix, or leave every target at zero to keep it unset.</p>
    <Button disabled={save.isPending || (total !== 0 && total !== 100)} onClick={async () => {
      if (Object.values(mix).some(v => !Number.isFinite(v) || v<0 || v>100)) return toast.error('Each target must be between 0 and 100.');
      try { await save.mutateAsync({content_pillars:[...new Set(pillars.split('\n').map(p => p.trim()).filter(Boolean))],mix_targets:total ? mix : {}}); }
      catch { /* useSaveKit displays the error */ }
    }}>Save content strategy</Button>
  </div>;
}
