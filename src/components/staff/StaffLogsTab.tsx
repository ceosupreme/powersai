import { useState, useMemo } from 'react';
import { FileText, Check, Clock, ChevronDown, ChevronRight, Loader2, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { useLogs, useCreateLogEntry, useSaveLogValues, useSubmitLog, useLogEntryValues } from '@/hooks/useLogs';
import { useLogSections } from '@/hooks/useLogFields';
import { useUserPositions } from '@/hooks/useUserPositions';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { LogField } from '@/components/shared/LogField';
import { LogFormSection } from '@/components/shared/LogFormSection';
import type { LogEntry, LogType, LogFormValues } from '@/types/logs';
import { LOG_TYPE_INFO } from '@/types/logs';
import type { Json } from '@/integrations/supabase/types';
import type { Department } from '@/hooks/useStaffDepartment';

interface StaffLogsTabProps {
  department: Department;
}

// Helper: evaluate condition_json against current form values
function evaluateCondition(
  condition: Record<string, unknown> | null,
  mergedValues: LogFormValues,
  fieldKeyToIdMap: Record<string, string>
): boolean {
  if (!condition) return true;
  const fieldKey = condition.field as string;
  const fieldId = fieldKeyToIdMap[fieldKey];
  if (!fieldId) return true;
  const currentValue = mergedValues[fieldId];

  if ('equals' in condition) {
    return currentValue === condition.equals;
  }
  if ('in' in condition && Array.isArray(condition.in)) {
    return (condition.in as unknown[]).includes(currentValue);
  }
  return true;
}

export const StaffLogsTab = ({ department }: StaffLogsTabProps) => {
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const [openLogType, setOpenLogType] = useState<LogType | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);

  const { selectedBar, supabaseBarId } = useApp();
  const effectiveBarId = supabaseBarId || selectedBar?.id;
  const { user } = useAuth();
  const { data: allLogs = [], isLoading: logsLoading } = useLogs(effectiveBarId);
  const { data: positions = [], isLoading: positionsLoading } = useUserPositions();
  const createLogEntry = useCreateLogEntry();

  const myLogs = allLogs.filter((log: LogEntry) => log.created_by === user?.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeLogs = myLogs.filter(
    (log: LogEntry) => log.status === 'draft' && new Date(log.created_at) >= today
  );
  const recentLogs = myLogs.filter((log: LogEntry) => log.status === 'submitted').slice(0, 10);

  // Get available log types from user positions
  // Staff pages only show staff_quick_log
  const availableLogTypes = useMemo(() => {
    return [{ logType: 'staff_quick_log' as LogType, label: LOG_TYPE_INFO.staff_quick_log.label }];
  }, []);

  const handleCreateLog = async (logType: LogType) => {
    if (!effectiveBarId) return;
    const existingDraft = activeLogs.find(l => l.log_type === logType);
    if (existingDraft) {
      setOpenLogId(existingDraft.id);
      setOpenLogType(logType);
      return;
    }
    try {
      const newLog = await createLogEntry.mutateAsync({ logType, barId: effectiveBarId });
      setOpenLogId(newLog.id);
      setOpenLogType(logType);
    } catch (error) {
      console.error('Failed to create log:', error);
    }
  };

  const isLoading = logsLoading || positionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* NEW LOG SECTION */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">New Log</h2>
        <div className="grid gap-3">
          {availableLogTypes
            .filter(lt => !activeLogs.some(l => l.log_type === lt.logType))
            .map(lt => (
              <Card key={lt.logType} className="card-interactive border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-primary/15">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{lt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lt.logType === 'staff_quick_log' ? 'Report an issue' : 'Due by close'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="default"
                      className="h-10 px-5 text-sm font-medium"
                      onClick={() => handleCreateLog(lt.logType)}
                      disabled={createLogEntry.isPending}
                    >
                      {createLogEntry.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1.5" />
                          Start
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      {/* ACTIVE DRAFTS */}
      {activeLogs.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">In Progress</h2>
          <div className="grid gap-3">
            {activeLogs.map((log: LogEntry) => (
              <Sheet key={log.id} open={openLogId === log.id} onOpenChange={(open) => {
                setOpenLogId(open ? log.id : null);
                setOpenLogType(open ? log.log_type : null);
              }}>
                <Card
                  className="card-interactive cursor-pointer border-l-2 border-l-primary"
                  onClick={() => { setOpenLogId(log.id); setOpenLogType(log.log_type); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/15">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{LOG_TYPE_INFO[log.log_type]?.label || log.log_type}</p>
                          <p className="text-xs text-gold mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {log.log_type === 'staff_quick_log' ? 'In progress' : 'Due by close'}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-gold/20 text-gold text-xs">Continue →</Badge>
                    </div>
                  </CardContent>
                </Card>
                <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle>{LOG_TYPE_INFO[log.log_type]?.label} — {format(new Date(log.created_at), 'MMM d, yyyy')}</SheetTitle>
                  </SheetHeader>
                  <RealLogForm logEntry={log} onClose={() => setOpenLogId(null)} />
                </SheetContent>
              </Sheet>
            ))}
          </div>
        </section>
      )}

      {/* ALL CAUGHT UP */}
      {availableLogTypes.every(lt => activeLogs.some(l => l.log_type === lt.logType)) && activeLogs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Check className="h-8 w-8 text-emerald-400 mb-2" />
            <p className="text-sm text-muted-foreground">All logs submitted. You're good!</p>
          </CardContent>
        </Card>
      )}

      {/* RECENT LOGS */}
      {recentLogs.length > 0 && (
        <Collapsible open={recentOpen} onOpenChange={setRecentOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            {recentOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">Recent Logs</span>
            <Badge variant="secondary" className="text-xs">{recentLogs.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {recentLogs.map((log: LogEntry) => (
              <Card key={log.id} className="opacity-70">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm text-muted-foreground">{LOG_TYPE_INFO[log.log_type]?.label || log.log_type}</span>
                        <p className="text-xs text-muted-foreground/70">{format(new Date(log.created_at), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-400 text-xs">Submitted ✓</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

// Real database-driven log form with conditional field support
const RealLogForm = ({ logEntry, onClose }: { logEntry: LogEntry; onClose: () => void }) => {
  const isQuickLog = logEntry.log_type === 'staff_quick_log';
  const [formValues, setFormValues] = useState<LogFormValues>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: sections = [], isLoading: fieldsLoading } = useLogSections(logEntry.log_type);
  const { data: existingValues = {} } = useLogEntryValues(logEntry.id);
  const saveLogValues = useSaveLogValues();
  const submitLog = useSubmitLog();

  // Build field key -> field ID map for condition evaluation
  const fieldKeyToIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.form_fields?.key) {
          map[field.form_fields.key] = field.field_id;
        }
      }
    }
    return map;
  }, [sections]);

  // Auto-set default date for quick logs
  const defaultValues = useMemo(() => {
    if (!isQuickLog) return {};
    const dateFieldId = fieldKeyToIdMap['issue_date'];
    if (!dateFieldId) return {};
    return { [dateFieldId]: format(new Date(), 'yyyy-MM-dd') };
  }, [isQuickLog, fieldKeyToIdMap]);

  // Merge: defaults < existing < user edits
  const mergedValues = useMemo(
    () => ({ ...defaultValues, ...existingValues, ...formValues }),
    [defaultValues, existingValues, formValues]
  );

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const allValues: Record<string, Json> = {};
      for (const [k, v] of Object.entries(mergedValues)) {
        if (v !== undefined && v !== null && v !== '') {
          allValues[k] = v as Json;
        }
      }
      await saveLogValues.mutateAsync({ logEntryId: logEntry.id, values: allValues });
      await submitLog.mutateAsync(logEntry.id);
      setIsSubmitted(true);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Failed to submit log:', error);
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-scale-in">
          <Check className="h-8 w-8 text-emerald-400" />
        </div>
        <p className="text-lg font-medium text-foreground">
          {isQuickLog ? 'Report Submitted!' : 'Log Submitted!'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isQuickLog ? 'Thanks — management has been notified.' : 'Great work 👏'}
        </p>
      </div>
    );
  }

  if (fieldsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No form fields configured for this log type.</p>
      </div>
    );
  }

  // Filter fields by condition visibility
  const visibleSections = sections.map(section => ({
    ...section,
    fields: section.fields.filter(field => {
      const condition = field.condition_json as Record<string, unknown> | null;
      return evaluateCondition(condition, mergedValues, fieldKeyToIdMap);
    }),
  })).filter(section => section.fields.length > 0);

  // Count filled required fields (only visible ones)
  const allVisibleFields = visibleSections.flatMap(s => s.fields);
  const requiredFields = allVisibleFields.filter(f => f.required);
  const filledRequired = requiredFields.filter(f => {
    const val = mergedValues[f.field_id];
    return val !== undefined && val !== null && val !== '';
  });
  const progress = requiredFields.length > 0 ? Math.round((filledRequired.length / requiredFields.length) * 100) : 100;

  return (
    <div className="space-y-5 pb-6">
      {/* Progress indicator */}
      {requiredFields.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{filledRequired.length}/{requiredFields.length} required fields</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Form sections */}
      {visibleSections.map((section, idx) => (
        <LogFormSection key={section.name} title={section.name} defaultOpen={idx < 2}>
          {section.fields.map(field => (
            <LogField
              key={field.id}
              field={field}
              value={mergedValues[field.field_id]}
              onChange={(val) => handleFieldChange(field.field_id, val)}
            />
          ))}
        </LogFormSection>
      ))}

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-12 text-base font-medium">
        {isSubmitting ? (
          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Submitting...</span>
        ) : (
          isQuickLog ? 'Submit Report' : 'Submit Log'
        )}
      </Button>
    </div>
  );
};
