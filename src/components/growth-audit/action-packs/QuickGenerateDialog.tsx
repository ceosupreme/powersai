// Ad-hoc Action Pack generator — for content not tied to a finding or campaign.
// Submits a `kind: 'ad_hoc'` GenerationContext to the existing pipeline.

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateActionPack } from './generateActionPack';
import { upsertPack } from './useActionPacks';
import { ASSET_KIND_LABEL } from '../findings/actionPackBlueprints';
import type { AssetKind, VenueContext } from './types';

const KIND_OPTIONS: AssetKind[] = [
  'social_post', 'gbp_post', 'email_draft', 'sms_draft',
  'staff_script', 'menu_callout', 'website_block', 'campaign_brief',
];

const DEFAULT_KINDS: AssetKind[] = ['social_post', 'gbp_post'];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venueContext: VenueContext;
};

export const QuickGenerateDialog = ({ open, onOpenChange, venueContext }: Props) => {
  const { toast } = useToast();
  const [brief, setBrief] = useState('');
  const [category, setCategory] = useState('');
  const [kinds, setKinds] = useState<Set<AssetKind>>(new Set(DEFAULT_KINDS));
  const [busy, setBusy] = useState(false);

  const toggle = (k: AssetKind) => {
    const next = new Set(kinds);
    if (next.has(k)) next.delete(k); else next.add(k);
    setKinds(next);
  };

  const reset = () => {
    setBrief(''); setCategory(''); setKinds(new Set(DEFAULT_KINDS));
  };

  const generate = async () => {
    if (!brief.trim()) {
      toast({ title: 'Brief required', description: 'Describe what you need in a sentence or two.', variant: 'destructive' });
      return;
    }
    if (kinds.size === 0) {
      toast({ title: 'Pick at least one asset kind', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const pack = await generateActionPack(
        {
          kind: 'ad_hoc',
          venueId: venueContext.venueId,
          brief: brief.trim(),
          category: category.trim() || undefined,
          assetKinds: Array.from(kinds),
        },
        venueContext,
      );
      upsertPack(pack);
      toast({
        title: 'Ad-hoc Action Pack generated',
        description: `${pack.assets.length} draft asset${pack.assets.length === 1 ? '' : 's'} • ${pack.source.toUpperCase()}`,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Generation failed', description: msg, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Quick Generate
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Generate marketing assets for a one-off — brand takeover, holiday push, theme night, etc.
            Not tied to a finding or campaign.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="brief" className="text-xs">Brief <span className="text-destructive">*</span></Label>
            <Textarea
              id="brief"
              rows={4}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Brand rep stopping by next Friday for a takeover — need social posts and a staff script."
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat" className="text-xs">Category tag (optional)</Label>
            <Input
              id="cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Brand partnership, Holiday, Theme night…"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Asset kinds</Label>
            <div className="flex flex-wrap gap-1.5">
              {KIND_OPTIONS.map(k => {
                const active = kinds.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggle(k)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition ${
                      active
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {ASSET_KIND_LABEL[k]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={generate} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {busy ? 'Generating…' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
