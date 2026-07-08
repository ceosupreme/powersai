import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer, Link2, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RecoveryReportRenderer } from './RecoveryReportRenderer';
import { useRecoveryReportMutations, type RecoveryReport } from '@/hooks/useRecoveryReports';

export function RecoveryReportPrintHarness({
  report,
  displayName,
  onBack,
}: {
  report: RecoveryReport;
  displayName: string;
  onBack: () => void;
}) {
  const { createShareLink, revokeShareLink, setReferralFooter } = useRecoveryReportMutations();
  const [referralFooter, setReferralFooterLocal] = useState<boolean>(report.share_referral_footer);

  const shareUrl = report.share_token
    ? `${window.location.origin}/r/${report.share_token}`
    : null;

  const canShare = report.status === 'reviewed' || report.status === 'sent';

  return (
    <div className="min-h-screen bg-[#F7F4EC]">
      <div className="proposal-no-print sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="rr-referral-toggle"
              checked={referralFooter}
              onCheckedChange={async (v) => {
                setReferralFooterLocal(v);
                try {
                  await setReferralFooter.mutateAsync({ id: report.id, referralFooter: v });
                } catch (e) {
                  setReferralFooterLocal(!v);
                  toast.error(e instanceof Error ? e.message : 'Failed');
                }
              }}
            />
            <Label htmlFor="rr-referral-toggle" className="text-xs">
              Show referral footer
            </Label>
          </div>
          <Badge variant="outline" className="text-[10px]">{report.status.toUpperCase()}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {canShare && !shareUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await createShareLink.mutateAsync({ id: report.id, referralFooter });
                  toast.success('Share link created');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed');
                }
              }}
            >
              <Link2 className="h-4 w-4 mr-1" /> Create share link
            </Button>
          )}
          {shareUrl && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success('Link copied');
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copy link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={async () => {
                  if (!confirm('Revoke this share link? Anyone with it will lose access.')) return;
                  try {
                    await revokeShareLink.mutateAsync(report.id);
                    toast.success('Link revoked');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed');
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Revoke
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print / PDF
          </Button>
        </div>
      </div>

      {!canShare && (
        <div className="proposal-no-print text-xs text-muted-foreground px-4 py-2 border-b bg-amber-50">
          Share link disabled — mark this report reviewed or sent before generating a public link.
        </div>
      )}

      {shareUrl && (
        <div className="proposal-no-print text-xs px-4 py-2 border-b bg-emerald-50 font-mono truncate">
          {shareUrl}
        </div>
      )}

      <RecoveryReportRenderer
        report={{
          display_name: displayName,
          period_start: report.period_start,
          period_end: report.period_end,
          metrics: report.metrics,
          estimated_dollars: report.estimated_dollars,
          estimate_basis: report.estimate_basis,
          narrative: report.narrative,
        }}
        referralFooter={referralFooter}
        status={report.status}
      />
    </div>
  );
}