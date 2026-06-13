import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Loader2, ChevronDown, Calendar, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert, Wrench, UserRound, FileText, Star, Mic, CircleOff, ClipboardCheck, type LucideIcon } from 'lucide-react';
import { LogForm } from '@/components/shared/LogForm';
import { VoiceNoteCapture } from '@/components/shared/VoiceNoteCapture';
import { LogListItem } from '@/components/shared/LogListItem';
import { useLogs } from '@/hooks/useLogs';
import { useApp } from '@/context/AppContext';
import { useRole } from '@/context/RoleContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import type { LogIntent } from '@/types/logIntents';
import { intentConfig } from '@/types/logIntents';
import type { LogPosition } from '@/types/logs';

const iconMap: Record<string, LucideIcon> = {
  AlertCircle, ShieldAlert, Wrench, UserRound, FileText, Star, Mic, CircleOff, ClipboardCheck,
};

type FlowStep = 'select' | 'form' | 'voice' | 'complete';

export default function Logs() {
  const { selectedBar, supabaseBarId } = useApp();
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intentParam = searchParams.get('intent') as LogIntent | null;
  const initialIntent = intentParam && intentConfig[intentParam] ? intentParam : null;

  const [step, setStep] = useState<FlowStep>(initialIntent ? (initialIntent === 'voice_note' ? 'voice' : 'form') : 'select');
  const [selectedIntent, setSelectedIntent] = useState<LogIntent | null>(initialIntent);

  // Resolve Supabase UUID: prefer profile's assigned_bar_id, then look up by bar name
  const barName = selectedBar?.bar_name;
  const { data: resolvedBarId } = useQuery({
    queryKey: ['resolve-bar-uuid', barName],
    queryFn: async () => {
      if (!barName) return null;
      const { data } = await supabase
        .from('venues')
        .select('id')
        .ilike('name', barName)
        .limit(1)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !supabaseBarId && !!barName,
  });

  const effectiveBarId = supabaseBarId || resolvedBarId || null;
  const { data: logs, isLoading: logsLoading } = useLogs(effectiveBarId || undefined);
  const submittedLogs = logs?.filter((log) => log.status === 'submitted') || [];

  // Filter intents by role
  const availableIntents = useMemo(() => {
    return (Object.entries(intentConfig) as [LogIntent, typeof intentConfig[LogIntent]][]).filter(
      ([, config]) => !currentRole || config.roles.includes(currentRole)
    );
  }, [currentRole]);

  const handleSelectIntent = (intent: LogIntent) => {
    setSelectedIntent(intent);
    if (intent === 'voice_note') {
      setStep('voice');
    } else {
      setStep('form');
    }
  };

  const handleReset = () => {
    setSelectedIntent(null);
    setStep('select');
  };

  // Map intent to LogPosition[]
  const getPositions = (): LogPosition[] => {
    if (!selectedIntent) return ['staff'];
    const config = intentConfig[selectedIntent];
    if (config.form === 'role_specific') {
      if (currentRole === 'owner' || currentRole === 'gm') return ['general_manager'];
      if (currentRole === 'lead') return ['shift_lead'];
    }
    return ['staff'];
  };

  if (!effectiveBarId) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No Venue Selected</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Please select a venue to access logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24 sm:pb-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Logs</h1>
          <p className="text-muted-foreground">
            Report incidents, capture notes, or complete your daily log
          </p>
        </div>

        {/* Step: Select Intent */}
        {step === 'select' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableIntents.map(([intent, config]) => (
              <button
                key={intent}
                onClick={() => handleSelectIntent(intent)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all text-center"
              >
              {(() => {
                  const IconComp = iconMap[config.icon];
                  return IconComp ? (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconComp className="h-5 w-5 text-primary" />
                    </div>
                  ) : null;
                })()}
                <span className="text-sm font-medium text-foreground">{config.title}</span>
                <span className="text-xs text-muted-foreground leading-tight">{config.description}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step: Form */}
        {step === 'form' && selectedIntent && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <LogForm
              barId={effectiveBarId!}
              availablePositions={getPositions()}
              onCancel={handleReset}
              onSubmitSuccess={() => setStep('complete')}
            />
          </div>
        )}

        {/* Step: Voice */}
        {step === 'voice' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <VoiceNoteCapture
              barId={effectiveBarId!}
              onComplete={() => setStep('complete')}
              onCancel={handleReset}
            />
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Log Submitted!</h3>
                <p className="text-sm text-muted-foreground mt-1">Your log has been saved successfully.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>Log Another</Button>
                <Button onClick={() => navigate('/')}>Done</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Previous Logs */}
        {logsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : submittedLogs.length > 0 ? (
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-background rounded-lg flex items-center justify-center shadow-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-foreground block">Previous Logs</span>
                    <span className="text-xs text-muted-foreground">{submittedLogs.length} total entries</span>
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-2">
                {submittedLogs.map((log) => (
                  <LogListItem key={log.id} log={log} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
}
