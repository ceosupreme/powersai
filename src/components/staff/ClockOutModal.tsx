import { AlertTriangle, ClipboardList, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { setClockStatus } from '@/data/staffMockData';

interface ClockOutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingTasks: { id: string; title: string }[];
  dueLogNames: string[];
  onClockOutAnyway: () => void;
}

export const ClockOutModal = ({ open, onOpenChange, remainingTasks, dueLogNames, onClockOutAnyway }: ClockOutModalProps) => {
  const navigate = useNavigate();
  const hasItems = remainingTasks.length > 0 || dueLogNames.length > 0;

  if (!hasItems) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gold" />
            Before you clock out
          </DialogTitle>
          <DialogDescription>
            You have incomplete items that need attention.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {remainingTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Remaining Tasks ({remainingTasks.length})
              </div>
              <ul className="space-y-1 pl-6">
                {remainingTasks.slice(0, 5).map(t => (
                  <li key={t.id} className="text-sm text-muted-foreground list-disc">{t.title}</li>
                ))}
                {remainingTasks.length > 5 && (
                  <li className="text-sm text-muted-foreground">+{remainingTasks.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {dueLogNames.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <FileText className="h-4 w-4 text-primary" />
                Logs Due ({dueLogNames.length})
              </div>
              <ul className="space-y-1 pl-6">
                {dueLogNames.map((name, i) => (
                  <li key={i} className="text-sm text-muted-foreground list-disc">{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {remainingTasks.length > 0 && (
            <Button
              onClick={() => { onOpenChange(false); navigate('/staff/tasks'); }}
              className="w-full"
            >
              Go to Tasks
            </Button>
          )}
          {dueLogNames.length > 0 && (
            <Button
              variant="outline"
              onClick={() => { onOpenChange(false); navigate('/staff/logs'); }}
              className="w-full"
            >
              Go to Logs
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground text-xs"
            onClick={() => {
              setClockStatus('out');
              onClockOutAnyway();
              onOpenChange(false);
            }}
          >
            Clock out anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
