import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Pen, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { LogFormSection } from './LogFormSection';
import { LogField } from './LogField';
import { VoiceInterviewMode } from './VoiceInterviewMode';
import { useLogSections } from '@/hooks/useLogFields';
import { useSaveLogValues, useSubmitLog } from '@/hooks/useLogs';
import { supabase } from '@/integrations/supabase/client';
import type { LogType, LogFormValues, LogTypeField, FormField, LogPosition } from '@/types/logs';
import { POSITION_INFO } from '@/types/logs';
import { FEATURES } from '@/lib/utils';

interface LogFormProps {
  barId: string;
  availablePositions: LogPosition[];
  onCancel?: () => void;
  onSubmitSuccess?: () => void;
}

type FormMode = 'written' | 'voice-interview';

// Evaluate if a field should be visible based on its condition_json and current form values
function evaluateCondition(
  condition: Record<string, unknown> | null,
  values: LogFormValues,
  allFields: (LogTypeField & { form_fields: FormField })[]
): boolean {
  if (!condition || Object.keys(condition).length === 0) {
    return true; // No condition means always visible
  }

  // Build a map from field key to field_id for lookups
  const keyToFieldId: Record<string, string> = {};
  allFields.forEach((f) => {
    keyToFieldId[f.form_fields.key] = f.field_id;
  });

  // Check all conditions (AND logic)
  for (const [fieldKey, expectedValue] of Object.entries(condition)) {
    const fieldId = keyToFieldId[fieldKey];
    if (!fieldId) continue; // Unknown field key, skip

    const actualValue = values[fieldId];

    // Handle boolean conditions
    if (typeof expectedValue === 'boolean') {
      if (actualValue !== expectedValue) {
        return false;
      }
    }
    // Handle string/value equality
    else if (actualValue !== expectedValue) {
      return false;
    }
  }

  return true;
}

export function LogForm({ barId, availablePositions, onCancel, onSubmitSuccess }: LogFormProps) {
  const navigate = useNavigate();
  
  // Auto-select position if only one available
  const initialPosition = availablePositions.length === 1 ? availablePositions[0] : null;
  const [selectedPosition, setSelectedPosition] = useState<LogPosition | null>(initialPosition);
  const [values, setValues] = useState<LogFormValues>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<FormMode>('written');

  const logType: LogType | null = selectedPosition 
    ? POSITION_INFO[selectedPosition].logType 
    : null;

  const { data: sections, isLoading: sectionsLoading } = useLogSections(logType);
  const saveValues = useSaveLogValues();
  const submitLog = useSubmitLog();

  const handleChange = (fieldId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Flatten all fields for condition evaluation
  const allFields = useMemo(() => {
    return sections?.flatMap((s) => s.fields) || [];
  }, [sections]);

  // Filter visible sections and fields based on conditions
  const visibleSections = useMemo(() => {
    if (!sections) return [];
    
    return sections.map((section) => ({
      ...section,
      fields: section.fields.filter((field) =>
        evaluateCondition(field.condition_json, values, allFields)
      ),
    })).filter((section) => section.fields.length > 0);
  }, [sections, values, allFields]);

  const handleSubmit = async () => {
    if (!selectedPosition) return;

    const missingRequired: string[] = [];
    visibleSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required) {
          const val = values[field.field_id];
          if (val === undefined || val === null || val === '') {
            missingRequired.push(field.form_fields.label);
          }
        }
      });
    });

    if (missingRequired.length > 0) {
      toast.error(`Please fill in: ${missingRequired.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create log entry directly with submitted status
      const lt = POSITION_INFO[selectedPosition].logType;
      const { data: logEntry, error: createError } = await supabase
        .from('log_entries')
        .insert({
          log_type: lt,
          bar_id: barId,
          created_by: user.id,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !logEntry) throw createError;

      // Save all values
      await saveValues.mutateAsync({ logEntryId: logEntry.id, values });
      
      toast.success('Log submitted successfully');
      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        navigate('/logs');
      }
    } catch {
      toast.error('Failed to submit log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiredFields = useMemo(() => {
    return visibleSections.flatMap((s) => s.fields.filter((f) => f.required));
  }, [visibleSections]);

  const filledRequired = useMemo(() => {
    return requiredFields.filter((f) => {
      const val = values[f.field_id];
      return val !== undefined && val !== null && val !== '';
    }).length;
  }, [requiredFields, values]);

  const progressPercent = requiredFields.length > 0 
    ? (filledRequired / requiredFields.length) * 100 
    : 0;

  const logLabel = selectedPosition ? POSITION_INFO[selectedPosition].logLabel : 'Daily Log';

  // Show position selector if multiple positions available
  const showPositionSelector = availablePositions.length > 1 && !selectedPosition;

  if (showPositionSelector) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Select Log Type</h1>
          <p className="text-muted-foreground mt-1">Choose the type of log you want to fill out</p>
        </div>

        <RadioGroup
          value={selectedPosition || ''}
          onValueChange={(val) => setSelectedPosition(val as LogPosition)}
          className="space-y-3"
        >
          {availablePositions.map((position) => {
            const info = POSITION_INFO[position];
            return (
              <Card 
                key={position} 
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200"
                onClick={() => setSelectedPosition(position)}
              >
                <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                  <RadioGroupItem value={position} id={position} className="shrink-0" />
                  <Label htmlFor={position} className="flex-1 cursor-pointer">
                    <div className="font-semibold text-base">{info.logLabel}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{info.label}</div>
                  </Label>
                </CardContent>
              </Card>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  if (sectionsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{logLabel}</h1>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{logLabel}</h1>
        <p className="text-muted-foreground text-sm">Fill out your daily log below</p>
      </div>

      {/* Mode Toggle - only show when voice interview is enabled */}
      {FEATURES.VOICE_INTERVIEW && (
        <div className="flex items-center justify-center">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(val) => val && setMode(val as FormMode)}
            className="bg-muted rounded-xl p-1.5 w-full sm:w-auto"
          >
            <ToggleGroupItem
              value="written"
              className="flex-1 sm:flex-none data-[state=on]:bg-background data-[state=on]:shadow-sm px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium"
            >
              <Pen className="h-4 w-4 mr-2" />
              Written
            </ToggleGroupItem>
            <ToggleGroupItem
              value="voice-interview"
              className="flex-1 sm:flex-none data-[state=on]:bg-background data-[state=on]:shadow-sm px-4 sm:px-6 py-2.5 rounded-lg text-sm font-medium"
            >
              <Mic className="h-4 w-4 mr-2" />
              Voice Interview
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {mode === 'voice-interview' && sections && logType ? (
        <VoiceInterviewMode
          logType={logType}
          sections={sections}
          values={values}
          onValueChange={handleChange}
          onSubmit={handleSubmit}
        />
      ) : (
        <>
          {/* Progress Card */}
          <Card className="border-0 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="py-4 px-4 sm:px-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-medium text-foreground">
                  {filledRequired}/{requiredFields.length} required
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>

          {/* Form sections */}
          <div className="space-y-4">
            {visibleSections.map((section) => (
              <LogFormSection key={section.name} title={section.name}>
                {section.fields.map((field) => (
                  <LogField
                    key={field.id}
                    field={field}
                    value={values[field.field_id]}
                    onChange={(val) => handleChange(field.field_id, val)}
                  />
                ))}
              </LogFormSection>
            ))}
          </div>

          {/* Submit button - Fixed on mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t sm:relative sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 sm:h-11 text-base font-medium shadow-lg sm:shadow-none"
              size="lg"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Send className="h-5 w-5 mr-2" />
              )}
              Submit Log
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
