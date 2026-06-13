import { CheckCircle2, PlayCircle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BatchTaskBarProps {
  selectedCount: number;
  onMarkDone: () => void;
  onMarkInProgress: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isProcessing: boolean;
}

export const BatchTaskBar = ({
  selectedCount,
  onMarkDone,
  onMarkInProgress,
  onDelete,
  onClearSelection,
  isProcessing,
}: BatchTaskBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-2xl">
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          {selectedCount} selected
        </span>
        <div className="w-px h-6 bg-border" />
        <Button
          size="sm"
          onClick={onMarkDone}
          disabled={isProcessing}
          className="bg-signal-green hover:bg-signal-green/90 text-white border-0"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Done
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onMarkInProgress}
          disabled={isProcessing}
        >
          <PlayCircle className="w-4 h-4 mr-1" />
          In Progress
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDelete}
          disabled={isProcessing}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="text-muted-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
};
