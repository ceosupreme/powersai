import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Zap, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseBriefingList } from '@/hooks/useWeeklyBriefing';
import { EmptyState } from '@/components/shared/EmptyState';
import type { WeeklyBriefingV2 } from '@/types/insights-v2';

interface AIBriefCardProps {
  briefing: WeeklyBriefingV2 | null | undefined;
  onViewFullBriefing?: () => void;
  isLoading?: boolean;
}

export const AIBriefCard = ({ briefing, onViewFullBriefing, isLoading }: AIBriefCardProps) => {
  if (isLoading) {
    return (
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-slate-700 rounded" />
          <div className="h-5 w-32 bg-slate-700 rounded" />
        </div>
        <div className="h-6 w-3/4 bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 w-full bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Today's AI Brief</h3>
        </div>
        <EmptyState 
          message="No briefing yet"
          title="No briefing yet"
          description="AI briefings are generated weekly based on your performance data."
          icon={<Sparkles className="w-6 h-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  const highlights = parseBriefingList(briefing.highlights_json, briefing.highlights);
  const watchFors = parseBriefingList(briefing.watch_fors_json, briefing.watch_fors);
  const priorityActions = parseBriefingList(briefing.priority_actions_json, briefing.priority_actions);

  return (
    <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Today's AI Brief</h3>
      </div>

      {/* Headline */}
      <p className="text-lg font-medium text-foreground mb-5">
        {briefing.headline}
      </p>

      {/* Highlights Section */}
      {highlights.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Highlights</span>
          </div>
          <ul className="space-y-1.5 pl-6">
            {highlights.slice(0, 3).map((item, idx) => (
              <li key={idx} className="text-sm text-slate-300 list-disc">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Watch For Section */}
      {watchFors.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Watch For</span>
          </div>
          <ul className="space-y-1.5 pl-6">
            {watchFors.slice(0, 3).map((item, idx) => (
              <li key={idx} className="text-sm text-slate-300 list-disc">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority Actions Section */}
      {priorityActions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Priority Actions</span>
          </div>
          <ul className="space-y-1.5 pl-6">
            {priorityActions.slice(0, 3).map((item, idx) => (
              <li key={idx} className="text-sm text-slate-300 list-disc">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View Full Briefing Button */}
      {onViewFullBriefing && (
        <div className="mt-5 pt-4 border-t border-slate-700/50">
          <Button 
            variant="ghost" 
            onClick={onViewFullBriefing}
            className="text-primary hover:text-primary/80 hover:bg-primary/10 p-0 h-auto font-medium"
          >
            View Full Briefing
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};
