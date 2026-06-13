import { DollarSign, Users, Settings, Star, Megaphone } from 'lucide-react';
import { getScoreColor, getGradeFromScore } from '@/utils/scoring';
import type { WeeklyBriefingV2, Sentiment, Grade } from '@/types/insights-v2';

interface WeeklyScoreCardMiniProps {
  briefing: WeeklyBriefingV2 | null | undefined;
  isLoading?: boolean;
}

const pillarIcons = {
  Revenue: DollarSign,
  Labor: Users,
  Operations: Settings,
  Guest: Star,
  Marketing: Megaphone,
};

const sentimentColors: Record<Sentiment, string> = {
  Strong: 'text-emerald-400 bg-emerald-500/20',
  Good: 'text-emerald-300 bg-emerald-500/10',
  Mixed: 'text-yellow-400 bg-yellow-500/20',
  Challenging: 'text-orange-400 bg-orange-500/20',
  Critical: 'text-red-400 bg-red-500/20',
};

export const WeeklyScoreCardMini = ({ briefing, isLoading }: WeeklyScoreCardMiniProps) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-5 animate-pulse">
        <div className="h-5 w-24 bg-muted rounded mb-4" />
        <div className="h-12 w-20 bg-muted rounded mb-4" />
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Default values if no briefing
  const overallScore = briefing?.overall_score ?? 0;
  const overallGrade = getGradeFromScore(overallScore);
  const sentiment = briefing?.overall_sentiment ?? 'Mixed';

  const pillarScores = [
    { key: 'Revenue', score: briefing?.revenue_score ?? 0 },
    { key: 'Labor', score: briefing?.labor_score ?? 0 },
    { key: 'Operations', score: briefing?.operations_score ?? 0 },
    { key: 'Guest', score: briefing?.guest_experience_score ?? 0 },
    { key: 'Marketing', score: briefing?.marketing_score ?? 0 },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">Weekly Score</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sentimentColors[sentiment]}`}>
          {sentiment}
        </span>
      </div>

      {/* Overall Score */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
          {overallScore || '--'}
        </span>
        <span className="text-muted-foreground text-lg">/100</span>
        <span className={`text-2xl font-bold ml-2 ${getScoreColor(overallScore)}`}>
          ({overallGrade})
        </span>
      </div>

      {/* Pillar Scores Row */}
      <div className="grid grid-cols-5 gap-2">
        {pillarScores.map(({ key, score }) => {
          const Icon = pillarIcons[key as keyof typeof pillarIcons];
          return (
            <div 
              key={key}
              className="flex flex-col items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Icon className={`w-4 h-4 mb-1 ${getScoreColor(score)}`} />
              <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                {score || '--'}
              </span>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {key === 'Guest' ? 'Guest' : key.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
