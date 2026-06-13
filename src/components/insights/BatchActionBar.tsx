import { useState } from 'react';
import { Check, X, Clock, AlarmClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface BatchActionBarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onSnoozeAll?: (date: Date) => void;
  onClearSelection: () => void;
  isProcessing: boolean;
}

export const BatchActionBar = ({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onSnoozeAll,
  onClearSelection,
  isProcessing,
}: BatchActionBarProps) => {
  const [snoozeOpen, setSnoozeOpen] = useState(false);

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
          onClick={onApproveAll}
          disabled={isProcessing}
          className="bg-signal-green hover:bg-signal-green/90 text-white border-0"
        >
          <Check className="w-4 h-4 mr-1" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRejectAll}
          disabled={isProcessing}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <X className="w-4 h-4 mr-1" />
          Dismiss
        </Button>
        {onSnoozeAll && (
          <Popover open={snoozeOpen} onOpenChange={setSnoozeOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={isProcessing}
                className="border-gold/40 text-gold hover:bg-gold/10"
              >
                <AlarmClock className="w-4 h-4 mr-1" />
                Snooze
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={undefined}
                onSelect={(date) => {
                  if (date) {
                    onSnoozeAll(date);
                    setSnoozeOpen(false);
                  }
                }}
                disabled={(date) => date <= new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className="text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
