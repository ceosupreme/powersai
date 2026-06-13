import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Edit3, Loader2, Send, Mic } from 'lucide-react';
import { FEATURES } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { LogField } from '@/components/shared/LogField';
import { VoiceInterviewMode } from '@/components/shared/VoiceInterviewMode';
import { useLogEntry, useLogEntryValues, useSaveLogValues, useSubmitLog } from '@/hooks/useLogs';
import { useLogSections } from '@/hooks/useLogFields';
import { useToast } from '@/hooks/use-toast';
import { LOG_TYPE_INFO } from '@/types/logs';
import type { LogFormValues } from '@/types/logs';

export default function LogInterview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if voice interview feature is disabled
  useEffect(() => {
    if (!FEATURES.VOICE_INTERVIEW) {
      navigate('/logs');
    }
  }, [navigate]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [values, setValues] = useState<LogFormValues>({});
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const { data: logEntry, isLoading: entryLoading } = useLogEntry(id || null);
  const { data: existingValues, isLoading: valuesLoading } = useLogEntryValues(id || null);
  const { data: sections, isLoading: sectionsLoading } = useLogSections(logEntry?.log_type || null);
  const saveLogValues = useSaveLogValues();
  const submitLog = useSubmitLog();

  // Flatten all fields for interview mode
  const allFields = useMemo(() => {
    if (!sections) return [];
    return sections.flatMap(section => 
      section.fields.map(field => ({
        ...field,
        sectionName: section.name,
      }))
    );
  }, [sections]);

  const currentField = allFields[currentIndex];
  const progress = allFields.length > 0 ? ((currentIndex + 1) / allFields.length) * 100 : 0;

  // Initialize values from existing data
  useEffect(() => {
    if (existingValues) {
      setValues(existingValues as LogFormValues);
    }
  }, [existingValues]);

  const handleChange = useCallback((value: unknown) => {
    if (!currentField) return;
    setValues(prev => ({ ...prev, [currentField.field_id]: value }));
  }, [currentField]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = async () => {
    // Save current value
    if (id && currentField) {
      try {
        await saveLogValues.mutateAsync({ logEntryId: id, values });
      } catch (error) {
        console.error('Failed to save:', error);
      }
    }

    if (currentIndex < allFields.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!id || !sections) return;

    // Check required fields
    const requiredFields = allFields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => {
      const value = values[f.field_id];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `Please fill in: ${missingFields.map(f => f.form_fields.label).join(', ')}`,
        variant: 'destructive',
      });
      // Navigate to first missing field
      const firstMissingIndex = allFields.findIndex(f => 
        missingFields.some(m => m.id === f.id)
      );
      if (firstMissingIndex >= 0) {
        setCurrentIndex(firstMissingIndex);
      }
      return;
    }

    try {
      await saveLogValues.mutateAsync({ logEntryId: id, values });
      await submitLog.mutateAsync(id);
      
      toast({
        title: 'Log submitted',
        description: 'Your daily log has been submitted successfully.',
      });
      
      navigate('/logs');
    } catch (error) {
      toast({
        title: 'Submit failed',
        description: 'Could not submit your log. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSwitchToWritten = () => {
    if (id) {
      saveLogValues.mutate({ logEntryId: id, values });
    }
    navigate(`/logs/new?continue=${id}`);
  };

  const handleVoiceValueChange = useCallback((fieldId: string, value: unknown) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const isLoading = entryLoading || valuesLoading || sectionsLoading;
  const isLastQuestion = currentIndex === allFields.length - 1;

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!logEntry || !sections) {
    return (
      <>
        <div className="p-4 max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/logs')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Logs
          </Button>
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold text-foreground mb-2">Log not found</h2>
            <p className="text-muted-foreground">
              This log doesn't exist or you don't have access to edit it.
            </p>
          </div>
        </div>
      </>
    );
  }

  const logInfo = LOG_TYPE_INFO[logEntry.log_type];

  // Voice interview mode - redirect to LogNew which now has integrated voice interview
  if (isVoiceMode) {
    return (
      <>
        <div className="p-4 max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => setIsVoiceMode(false)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Text Mode
          </Button>
          <VoiceInterviewMode
            logType={logEntry.log_type}
            sections={sections}
            values={values}
            onValueChange={handleVoiceValueChange}
            onSubmit={handleSubmit}
          />
        </div>
      </>
    );
  }

  if (!currentField) {
    return (
      <>
        <div className="p-4 max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/logs')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Logs
          </Button>
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold text-foreground mb-2">No fields configured</h2>
            <p className="text-muted-foreground">This log type has no fields configured yet.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 max-w-2xl mx-auto min-h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/logs')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsVoiceMode(true)}>
                <Mic className="h-4 w-4 mr-2" />
                Voice Mode
              </Button>
              <Button variant="outline" size="sm" onClick={handleSwitchToWritten}>
                <Edit3 className="h-4 w-4 mr-2" />
                Written Form
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{logInfo.label}</span>
              <span>Question {currentIndex + 1} of {allFields.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Question Card */}
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 flex flex-col justify-center py-8">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              {currentField.sectionName}
            </div>
            
            <div className="mb-8">
              <LogField
                field={currentField}
                value={values[currentField.field_id]}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={submitLog.isPending}
              className="flex-1"
            >
              {submitLog.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={saveLogValues.isPending}
              className="flex-1"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
