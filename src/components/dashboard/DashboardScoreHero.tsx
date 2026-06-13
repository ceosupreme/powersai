import { cn } from '@/lib/utils';
import { TrendArrow } from '@/components/shared/TrendArrow';
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';

interface DashboardScoreHeroProps {
  overallScore: number;
  overallGrade?: string;
  confidence?: string;
  trend?: 'up' | 'down' | 'flat' | string;
  weekStart: string;
  barName?: string;
}

export const DashboardScoreHero = ({ overallScore, overallGrade, confidence = 'Med', trend = 'flat', weekStart, barName }: DashboardScoreHeroProps) => {
  const grade = overallGrade || getGradeFromScore(overallScore);
  const gradeColorHex = getGradeColor(grade);
  
  const formatWeekLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  return (
    <div className="card-metric p-6 md:p-8 mb-6 animate-fade-in-up">
      <div className="flex flex-col items-center justify-center text-center relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        </div>

        {barName && (
          <div className="mb-4 relative z-10">
            <span className="text-muted-foreground text-sm px-3 py-1 bg-muted/30 rounded-full">
              {barName}
            </span>
          </div>
        )}

        <h3 className="text-sm font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-4 relative z-10">
          Overall Score
        </h3>

        <div 
          className="text-7xl md:text-8xl font-bold font-mono mb-3 relative z-10 animate-score-glow"
          style={{ color: '#22d3ee' }}
        >
          {Math.round(overallScore)}
        </div>
        
        <div className="mb-4 relative z-10">
          <span
            className="inline-block px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-4xl md:text-5xl font-bold font-sans shadow-lg text-white"
            style={{ backgroundColor: gradeColorHex }}
          >
            {grade}
          </span>
        </div>
        
        <div className="flex items-center gap-4 relative z-10 mb-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>4-Week Trend:</span>
            <TrendArrow direction={(trend === 'up' || trend === 'down' || trend === 'flat') ? trend : 'flat'} />
          </div>
          <div className="text-sm text-muted-foreground">
            Confidence: <span className={cn(
              'font-semibold',
              confidence === 'High' && 'text-signal-green',
              confidence === 'Med' && 'text-gold',
              confidence === 'Low' && 'text-destructive'
            )}>{confidence}</span>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground relative z-10 px-3 py-1 bg-muted/20 rounded-full">
          Week of {formatWeekLabel(weekStart)}
        </div>
      </div>
    </div>
  );
};
