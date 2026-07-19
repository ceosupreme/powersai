import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Mail, ShieldCheck, Send, Loader2 } from 'lucide-react';
import {
  useAutomationEnrollments,
  useUpsertEnrollment,
  type AutomationEnrollment,
} from '@/hooks/useAutomationEnrollments';

type Mode = 'log_only' | 'live' | 'mixed' | 'none';

function readEmailAdapter(config: Record<string, unknown> | null | undefined): string | undefined {
  const adapters = (config?.adapters ?? {}) as Record<string, unknown>;
  const v = adapters.email;
  return typeof v === 'string' ? v : undefined;
}

function deriveMode(enrollments: AutomationEnrollment[]): Mode {
  if (enrollments.length === 0) return 'none';
  const values = enrollments.map((e) => readEmailAdapter(e.config));
  const allManual = values.every((v) => v === 'manual_log');
  const allLive = values.every((v) => v === undefined);
  if (allManual) return 'log_only';
  if (allLive) return 'live';
  return 'mixed';
}

function useResendAvailable() {
  return useQuery({
    queryKey: ['send-adapter-status'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-adapter-status', { body: {} });
      if (error) throw error;
      return Boolean((data as any)?.hasResendKey);
    },
  });
}

export function EmailDeliveryModeCard({ projectId }: { projectId: string }) {
  const { data: enrollments = [], isLoading } = useAutomationEnrollments(projectId);
  const { data: resendAvailable, isLoading: statusLoading } = useResendAvailable();
  const upsert = useUpsertEnrollment();
  const [confirmLive, setConfirmLive] = useState(false);
  const [busy, setBusy] = useState(false);

  const mode = useMemo(() => deriveMode(enrollments), [enrollments]);

  const applyMode = async (next: 'log_only' | 'live') => {
    if (enrollments.length === 0) return;
    setBusy(true);
    try {
      for (const e of enrollments) {
        const prev = (e.config ?? {}) as Record<string, unknown>;
        const prevAdapters = (prev.adapters ?? {}) as Record<string, unknown>;
        const nextAdapters: Record<string, unknown> = { ...prevAdapters, sms: 'manual_log' };
        if (next === 'log_only') {
          nextAdapters.email = 'manual_log';
        } else {
          delete nextAdapters.email;
        }
        await upsert.mutateAsync({
          project_id: projectId,
          automation_key: e.automation_key,
          enabled: e.enabled,
          approval_mode: e.approval_mode,
          config: { ...prev, adapters: nextAdapters },
        });
      }
      toast.success(
        next === 'live'
          ? 'Email delivery is now live via Resend.'
          : 'Email delivery set to log-only (safe mode).',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update delivery mode');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return null;
  if (enrollments.length === 0) return null;

  const liveDisabled = resendAvailable === false;
  const liveDisabledReason = liveDisabled
    ? 'RESEND_API_KEY is not configured on the server. Add the key in project secrets to enable live delivery.'
    : null;

  const liveSelected = mode === 'live';
  const logSelected = mode === 'log_only';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Email delivery
          {mode === 'mixed' && (
            <Badge variant="destructive" className="ml-1 text-[10px] uppercase">Mixed</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Controls whether approved emails for this project actually send.
          SMS remains log-only regardless (Twilio is not live yet).
        </p>

        {mode === 'mixed' && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
            Some automations are pinned to log-only, others will send live. Choose one to normalize.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Log only */}
          <button
            type="button"
            disabled={busy || logSelected}
            onClick={() => applyMode('log_only')}
            className={`text-left rounded-md border p-3 transition-colors ${
              logSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/60'
            } disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Log only (safe mode)
              {logSelected && <Badge variant="secondary" className="ml-auto text-[10px]">Current</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Approved emails are recorded in the queue as
              <span className="font-mono"> logged (not delivered)</span>. Nothing reaches recipients.
            </p>
          </button>

          {/* Live */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">
                  <button
                    type="button"
                    disabled={busy || liveDisabled || liveSelected}
                    onClick={() => setConfirmLive(true)}
                    className={`w-full text-left rounded-md border p-3 transition-colors ${
                      liveSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/60'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Send className="h-4 w-4 text-primary" />
                      Live via Resend
                      {liveSelected && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">Current</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Approved emails send through Resend using the configured sender domain.
                    </p>
                  </button>
                </span>
              </TooltipTrigger>
              {liveDisabledReason && (
                <TooltipContent className="max-w-xs">{liveDisabledReason}</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {(busy || statusLoading) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {busy ? 'Updating enrollments…' : 'Checking delivery availability…'}
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmLive} onOpenChange={setConfirmLive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on live email delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              Approved emails will really send to real recipients from this point on.
              Drafts already waiting are unaffected until approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async (e) => {
                e.preventDefault();
                await applyMode('live');
                setConfirmLive(false);
              }}
            >
              Turn on live delivery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}