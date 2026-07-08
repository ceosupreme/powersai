import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sparkles, Printer, ArrowLeft, Send, Undo2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useProposals, useProposalMutations } from '@/hooks/useProposals';
import { useLatestLeakStackRun } from '@/hooks/useLeakStack';
import { ProposalBuilderDialog } from './ProposalBuilderDialog';
import { ProposalRenderer } from './ProposalRenderer';
import type { ProposalRow } from './types';

export function ProposalsListCard({
  companyId,
  venueId,
  defaultProspectName,
}: {
  companyId: string | null;
  venueId: string | null;
  defaultProspectName: string;
}) {
  const { isAdmin } = useAuth();
  const proposalsQ = useProposals({ companyId, venueId });
  const { setStatus, remove } = useProposalMutations();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [preview, setPreview] = useState<ProposalRow | null>(null);
  const runQ = useLatestLeakStackRun(preview?.venue_id ?? venueId);

  // Non-admins: RLS blocks writes and (for company-only rows) reads.
  // Also hide the entire card unless there is something to show, so the surface
  // isn't advertised to non-admins.
  const rows = proposalsQ.data ?? [];
  if (!isAdmin && rows.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Proposals</h3>
        {isAdmin && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setBuilderOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> Generate proposal
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground italic border rounded p-3">
          No proposals yet. Generate one from the latest leak stack.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm border rounded p-2">
              <div className="min-w-0 flex-1">
                <div className="truncate">{r.title}</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <Badge variant={r.status === 'sent' ? 'default' : 'outline'}>{r.status}</Badge>
              <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setPreview(r)}>
                <Printer className="h-3.5 w-3.5" /> View
              </Button>
              {isAdmin && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title={r.status === 'draft' ? 'Mark sent' : 'Revert to draft'}
                    onClick={async () => {
                      await setStatus.mutateAsync({ id: r.id, status: r.status === 'draft' ? 'sent' : 'draft' });
                      toast.success(r.status === 'draft' ? 'Marked sent' : 'Reverted to draft');
                    }}
                  >
                    {r.status === 'draft' ? <Send className="h-3.5 w-3.5" /> : <Undo2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={async () => {
                      if (!confirm('Delete this proposal?')) return;
                      await remove.mutateAsync(r.id);
                      toast.success('Deleted');
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <ProposalBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          companyId={companyId}
          venueId={venueId}
          defaultProspectName={defaultProspectName}
          onCreated={(row) => setPreview(row)}
        />
      )}

      {/* Preview / Print */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
          {preview && (
            <div>
              <div className="proposal-no-print sticky top-0 z-20 flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur">
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Badge variant="outline" className="text-[10px]">{preview.status.toUpperCase()}</Badge>
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" /> Print / PDF
                </Button>
              </div>
              <ProposalRenderer proposal={preview} run={runQ.data ?? null} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}