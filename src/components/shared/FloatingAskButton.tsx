import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { AskBarPulseWidget } from './AskBarPulseWidget';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

export const FloatingAskButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { supabaseBarId, selectedBar } = useApp();
  const venueName = selectedBar?.bar_name || 'BarPulse';

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed z-40 rounded-full bg-primary text-primary-foreground shadow-lg',
            'flex items-center justify-center transition-all duration-200',
            'hover:bg-primary/90 hover:scale-110 hover:shadow-xl',
            'active:scale-95 touch-manipulation',
            isMobile
              ? 'bottom-20 right-4 w-12 h-12'
              : 'bottom-6 right-6 w-14 h-14'
          )}
          aria-label="Ask BarPulse"
        >
          <Lightbulb className={cn(isMobile ? 'w-5 h-5' : 'w-6 h-6')} />
        </button>
      )}

      {/* Slide-in Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={cn(
              'absolute right-0 top-0 h-full bg-background border-l border-border shadow-2xl flex flex-col animate-slide-in-right',
              isMobile ? 'w-full' : 'w-full max-w-md'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Ask BarPulse — {venueName}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors touch-manipulation"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <AskBarPulseWidget
                key={supabaseBarId || 'no-venue'}
                context={{ pillar: 'General', bar_id: supabaseBarId || undefined }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
