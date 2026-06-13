import { WeeklyScorecard } from '@/types/venue';
import { cn } from '@/lib/utils';
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';

interface ScoreCardProps {
  scorecard: WeeklyScorecard;
  barName?: string;
  weekLabel?: string;
}

export const ScoreCard = ({ scorecard, barName, weekLabel }: ScoreCardProps) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center relative">
      {/* Subtle glow behind score */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Bar Name */}
      {barName && (
        <div className="mb-4 relative z-10">
          <span className="text-muted-foreground text-sm px-3 py-1 bg-muted/30 rounded-full">{barName}</span>
        </div>
      )}

      {/* Title */}
      <h3 className="text-sm font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-4 relative z-10">
        Overall Score
      </h3>

      {/* Main Score */}
      <div className="text-6xl md:text-7xl lg:text-8xl font-bold font-mono text-primary mb-2 relative z-10 animate-score-glow">
        {Math.round(scorecard.overall_score)}
      </div>
      
      {/* Grade with Colored Pill Background */}
      <div className="mb-4 relative z-10">
        {(() => {
          const grade = getGradeFromScore(scorecard.overall_score);
          const color = getGradeColor(grade);
          return (
            <span
              className="inline-block px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-4xl md:text-5xl font-bold font-sans shadow-lg text-white"
              style={{ backgroundColor: color }}
            >
              {grade}
            </span>
          );
        })()}
      </div>
      
      {/* Week Label */}
      {weekLabel && (
        <div className="text-sm text-muted-foreground relative z-10 px-3 py-1 bg-muted/20 rounded-full">
          Week of {weekLabel}
        </div>
      )}
    </div>
  );
};
