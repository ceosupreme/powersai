// Single asset row — Copy / Edit / Regenerate / Send-to-Marketing-Hub.
// Used inside the per-finding ActionPackPanel and the Action Center inbox.

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Pencil, RefreshCcw, Save, X, ChevronDown, ChevronRight, ExternalLink, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ActionPackAsset, AssetStatus } from './types';
import { ASSET_KIND_LABEL } from '../findings/actionPackBlueprints';
import { AssetApprovalPopover } from './AssetApprovalPopover';

type Props = {
  asset: ActionPackAsset;
  findingTitle?: string;
  blocked?: boolean;
  blockedReason?: string;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onSourceClick?: () => void;
  onRegenerate: (refinement?: string) => Promise<void>;
  onEdit: (body: string) => void;
  onApprove: (payload: { assigneeId?: string; dueDate?: string; notes?: string }) => void;
  onReject: () => void;
};

const statusTone: Record<AssetStatus, string> = {
  Draft: 'bg-muted text-muted-foreground border-border',
  'In Use': 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  Launched: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  Archived: 'bg-muted/50 text-muted-foreground border-border line-through',
};

export const AssetRow = ({
  asset, findingTitle, blocked, blockedReason,
  selectable, selected, onToggleSelect, onSourceClick,
  onRegenerate, onEdit, onApprove, onReject,
}: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(asset.body);
  const [refinement, setRefinement] = useState('');
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    const txt = asset.meta?.subject ? `Subject: ${asset.meta.subject}\n\n${asset.body}` : asset.body;
    try {
      await navigator.clipboard.writeText(txt);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const saveEdit = () => {
    onEdit(draft);
    setEditing(false);
    toast({ title: 'Asset updated' });
  };

  const regen = async () => {
    setBusy(true);
    try {
      await onRegenerate(refinement.trim() || undefined);
      setRefinement('');
      toast({ title: 'Regenerated' });
    } finally { setBusy(false); }
  };

  return (
    <Card className="p-3 border-border/60 bg-card/40">
      <div className="flex items-start gap-3">
        {selectable && (
          <Checkbox checked={!!selected} onCheckedChange={onToggleSelect} className="mt-1" />
        )}
        <button onClick={() => setOpen(o => !o)} className="mt-0.5 text-muted-foreground hover:text-foreground" aria-label="Toggle">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{ASSET_KIND_LABEL[asset.kind]}</Badge>
            {asset.variant !== undefined && (
              <Badge variant="outline" className="text-[10px] bg-muted/40">v{asset.variant}</Badge>
            )}
            <span className="text-sm font-medium text-foreground truncate">{asset.title}</span>
            <Badge variant="outline" className={`text-[10px] ${statusTone[asset.status]}`}>{asset.status}</Badge>
            {asset.approval === 'Approved' && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Approved</Badge>
            )}
            {asset.approval === 'Rejected' && (
              <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-500 border-red-500/30">Rejected</Badge>
            )}
            {asset.regenerationCount > 0 && (
              <span className="text-[10px] text-muted-foreground">↻ {asset.regenerationCount}</span>
            )}
            {findingTitle && onSourceClick && (
              <button onClick={onSourceClick} className="ml-auto text-[10px] text-primary hover:underline flex items-center gap-1 truncate max-w-[260px]">
                <ExternalLink className="w-3 h-3" /> {findingTitle}
              </button>
            )}
          </div>
          {!open && !editing && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{asset.body}</p>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 ml-7">
          {asset.meta?.subject && (
            <div className="text-xs"><span className="text-muted-foreground">Subject:</span> <span className="text-foreground font-medium">{asset.meta.subject}</span></div>
          )}
          {editing ? (
            <>
              <Textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} className="text-xs font-mono" />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 gap-1" onClick={saveEdit}><Save className="w-3 h-3" /> Save</Button>
                <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => { setDraft(asset.body); setEditing(false); }}>
                  <X className="w-3 h-3" /> Cancel
                </Button>
              </div>
            </>
          ) : (
            <pre className="text-xs whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans">{asset.body}</pre>
          )}

          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/40">
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={copy}><Copy className="w-3 h-3" /> Copy</Button>
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setEditing(e => !e)}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
            <Input
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder="Refinement instructions (optional)"
              className="h-7 text-[11px] flex-1 min-w-[160px]"
            />
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={regen} disabled={busy}>
              <RefreshCcw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} /> Regenerate
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto">
                  <AssetApprovalPopover
                    disabled={blocked || asset.approval !== 'Proposed'}
                    disabledReason={blockedReason}
                    onApprove={onApprove}
                    onReject={onReject}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {blocked
                  ? blockedReason ?? 'Blocked by Ops Readiness Gate.'
                  : asset.approval !== 'Proposed'
                  ? `Already ${asset.approval.toLowerCase()}.`
                  : 'Marketing Hub send pipeline ships in a later phase — status updates for now.'}
              </TooltipContent>
            </Tooltip>
          </div>

          {blocked && (
            <div className="text-[11px] text-destructive flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" /> {blockedReason}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
