import { useState, useMemo } from 'react';
import { MessageSquare, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TalkingPoints, smartDedup } from './TalkingPoints';
import { ActionCardWithWeek } from '@/hooks/useActionItems';
import { cn } from '@/lib/utils';

interface GMeetingPrepSectionProps {
  actions: ActionCardWithWeek[];
}

export function GMeetingPrepSection({ actions }: GMeetingPrepSectionProps) {
  const [open, setOpen] = useState(false);
  const pointCount = useMemo(() => Math.min(smartDedup(actions).length, 5), [actions]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full">
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        <MessageSquare className="w-4 h-4" />
        <span>GM Meeting Prep</span>
        {pointCount > 0 && (
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
            {pointCount} talking point{pointCount !== 1 ? 's' : ''}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4">
        <TalkingPoints actions={actions} />
      </CollapsibleContent>
    </Collapsible>
  );
}
