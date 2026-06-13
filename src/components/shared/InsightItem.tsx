import { useState } from 'react';
import { Insight } from '@/types/venue';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InsightItemProps {
  insight: Insight;
}

const priorityClasses: Record<string, string> = {
  High: 'severity-high',
  Medium: 'severity-medium',
  Low: 'severity-low',
};

export const InsightItem = ({ insight }: InsightItemProps) => {
  const [expanded, setExpanded] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <span className={cn('severity-dot mt-1.5 flex-shrink-0', priorityClasses[insight.priority])} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground text-sm font-medium">{insight.title}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {insight.estimated_weekly_impact_dollars > 0 && (
                  <span className="text-signal-green font-mono text-sm">
                    +{formatCurrency(insight.estimated_weekly_impact_dollars)}
                  </span>
                )}
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 ml-5 pl-3 border-l border-border animate-fade-in">
          {insight.summary && (
            <p className="text-muted-foreground text-sm mb-2">{insight.summary}</p>
          )}
          {insight.facts && (
            <div className="text-sm text-foreground/80 whitespace-pre-line bg-muted/30 rounded p-3">
              {insight.facts}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
