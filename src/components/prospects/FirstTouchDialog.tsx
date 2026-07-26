import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Loader2 } from 'lucide-react';
import { useFirstTouchDraft, type Prospect } from '@/hooks/useProspects';
import { toast } from '@/hooks/use-toast';

interface Props {
  prospect: Prospect | null;
  onOpenChange: (v: boolean) => void;
}

export const FirstTouchDialog = ({ prospect, onOpenChange }: Props) => {
  const draft = useFirstTouchDraft();
  const [sms, setSms] = useState('');
  const [loom, setLoom] = useState('');

  useEffect(() => {
    if (!prospect) return;
    setSms(''); setLoom('');
    draft.mutate(prospect.id, {
      onSuccess: (d) => { setSms(d.sms); setLoom(d.loom_script); },
      onError: (e: any) =>
        toast({ title: 'Draft failed', description: e?.message, variant: 'destructive' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect?.id]);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  return (
    <Dialog open={!!prospect} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>First touch — {prospect?.business_name}</DialogTitle>
          <DialogDescription>
            Built from this prospect's computed leak estimates. Figures are estimates from
            public data. Nothing sends from here — you send it.
          </DialogDescription>
        </DialogHeader>

        {draft.isPending ? (
          <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Drafting…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  SMS / DM
                </span>
                <Button size="sm" variant="outline" onClick={() => copy(sms, 'SMS')} disabled={!sms}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                </Button>
              </div>
              <Textarea value={sms} onChange={(e) => setSms(e.target.value)} rows={5} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  60-second Loom script
                </span>
                <Button size="sm" variant="outline" onClick={() => copy(loom, 'Loom script')} disabled={!loom}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                </Button>
              </div>
              <Textarea value={loom} onChange={(e) => setLoom(e.target.value)} rows={10} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};