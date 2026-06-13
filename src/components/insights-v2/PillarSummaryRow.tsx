import { DollarSign, Users, Settings, Star, Megaphone, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { getScoreColor } from '@/utils/scoring';
import { getPillarDisplayName } from '@/types/insights-v2';
import type { InsightV2, PillarV2 } from '@/types/insights-v2';

interface PillarSummaryRowProps {
  summaries: InsightV2[];
  variant?: 'compact' | 'expandable';
}

const pillarIcons = {
  Revenue: DollarSign,
  Labor: Users,
  Operations: Settings,
  Guest: Star,
  Marketing: Megaphone,
};

const pillarOrder: PillarV2[] = ['Revenue', 'Labor', 'Operations', 'Guest', 'Marketing'];

export const PillarSummaryRow = ({ summaries, variant = 'compact' }: PillarSummaryRowProps) => {
  const [expandedPillar, setExpandedPillar] = useState<PillarV2 | null>(null);

  // Map summaries by pillar
  const summaryByPillar = summaries.reduce((acc, s) => {
    acc[s.pillar] = s;
    return acc;
  }, {} as Record<PillarV2, InsightV2>);

  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-5 gap-2 mb-6">
        {pillarOrder.map(pillar => {
          const summary = summaryByPillar[pillar];
          const Icon = pillarIcons[pillar];
          // Extract score from title if present (e.g., "Revenue (60)" -> 60)
          const scoreMatch = summary?.title?.match(/\((\d+)\)/);
          const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
          
          return (
            <div 
              key={pillar}
              className="bg-card border border-border/50 rounded-xl p-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${getScoreColor(score)}`} />
                <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                  {score || '--'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {summary?.summary?.slice(0, 50) || getPillarDisplayName(pillar)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // Expandable variant
  return (
    <div className="bg-card border border-border/50 rounded-xl mb-6 overflow-hidden">
      <div className="p-4 border-b border-border/30">
        <h3 className="font-semibold text-foreground">Weekly Pillar Insights</h3>
      </div>
      <div className="divide-y divide-border/30">
        {pillarOrder.map(pillar => {
          const summary = summaryByPillar[pillar];
          const Icon = pillarIcons[pillar];
          const scoreMatch = summary?.title?.match(/\((\d+)\)/);
          const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
          const isExpanded = expandedPillar === pillar;

          return (
            <div key={pillar}>
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedPillar(isExpanded ? null : pillar)}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${getScoreColor(score)}`} />
                  <span className="font-medium text-foreground">
                    {getPillarDisplayName(pillar)}
                  </span>
                  <span className={`font-bold ${getScoreColor(score)}`}>
                    ({score}/100)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              {isExpanded && summary && (
                <div className="px-4 pb-4 pl-12">
                  <p className="text-sm text-muted-foreground">
                    {summary.summary}
                  </p>
                  {summary.detail && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {summary.detail}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
