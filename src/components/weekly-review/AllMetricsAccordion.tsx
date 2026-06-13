import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToastLiveWidget } from '@/components/shared/ToastLiveWidget';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AllMetricsAccordionProps {
  barId?: string;
  weekRange?: string;
}

export function AllMetricsAccordion({ barId, weekRange }: AllMetricsAccordionProps) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Detailed Performance</span>
            {weekRange && <span className="text-xs text-muted-foreground">{weekRange}</span>}
          </div>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2">
          <ToastLiveWidget barId={barId} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
