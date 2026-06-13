import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { LogStatusBadge } from '@/components/shared/LogStatusBadge';
import { useLogEntry, useLogEntryValues, useDeleteLog } from '@/hooks/useLogs';
import { useLogSections } from '@/hooks/useLogFields';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LOG_TYPE_INFO } from '@/types/logs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function LogDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: logEntry, isLoading: entryLoading } = useLogEntry(id || null);
  const { data: values, isLoading: valuesLoading } = useLogEntryValues(id || null);
  const { data: sections, isLoading: sectionsLoading } = useLogSections(logEntry?.log_type || null);
  const deleteLog = useDeleteLog();

  const isLoading = entryLoading || valuesLoading || sectionsLoading;

  const canDelete = logEntry?.created_by === user?.id && logEntry?.status === 'draft';

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteLog.mutateAsync(id);
      toast({
        title: 'Log deleted',
        description: 'The draft log has been deleted.',
      });
      navigate('/logs');
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Could not delete the log. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatValue = (value: unknown, fieldType: string): string => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    
    if (fieldType === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (fieldType === 'rating_1_10') {
      return `${value}/10`;
    }

    return String(value);
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!logEntry) {
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
              This log doesn't exist or you don't have access to view it.
            </p>
          </div>
        </div>
      </>
    );
  }

  const logInfo = LOG_TYPE_INFO[logEntry.log_type];

  return (
    <>
      <div className="p-4 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/logs')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Logs
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{logInfo.label}</h1>
            <LogStatusBadge status={logEntry.status} />
          </div>
          <div className="text-sm text-muted-foreground">
            <span>{logEntry.profiles?.full_name || logEntry.profiles?.email || 'Unknown'}</span>
            <span className="mx-2">•</span>
            <span>{format(new Date(logEntry.created_at), 'PPP p')}</span>
          </div>
          {logEntry.submitted_at && (
            <div className="text-sm text-muted-foreground mt-1">
              Submitted: {format(new Date(logEntry.submitted_at), 'PPP p')}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {sections?.map((section) => (
            <Card key={section.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{section.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.fields.map((ltf, idx) => {
                  const value = values?.[ltf.field_id];
                  const displayValue = formatValue(value, ltf.form_fields.field_type);
                  
                  return (
                    <div key={ltf.id}>
                      {idx > 0 && <Separator className="mb-4" />}
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {ltf.form_fields.label}
                        </div>
                        <div className="text-foreground whitespace-pre-wrap">
                          {displayValue}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        {canDelete && (
          <div className="mt-6 pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Draft
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The draft log and all its data will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </>
  );
}
