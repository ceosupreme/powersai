import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp } from 'lucide-react';
import { getGradeFromScore, getGradeColor } from '@/utils/scoring';

interface PageScoreCardProps {
  title: string;
  score: number;
  grade?: string; // Ignored - always computed from score
  weekLabel?: string;
  drivers?: string;
}

const parseDrivers = (driversString: string): string[] => {
  const items = driversString.split(/[;•\n]/).filter(d => d.trim());
  return items.slice(0, 3).map(item => item.trim());
};

export const PageScoreCard = ({ 
  title, 
  score,
  weekLabel,
  drivers,
}: PageScoreCardProps) => {
  const grade = getGradeFromScore(score);
  const gradeColorHex = getGradeColor(grade);
  return (
    <div className="card-metric p-6 md:p-8 mb-8 relative overflow-hidden group">
      {/* Gradient background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      {/* Title - uppercase like dashboard */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-sans font-semibold uppercase tracking-widest text-muted-foreground">
          {title} Score
        </h3>
      </div>

      {/* Main content: Score left, Drivers right */}
      <div className="flex flex-col lg:flex-row lg:gap-8 relative z-10">
        {/* Left: Score + Grade */}
        <div className="lg:w-1/3">
          {/* Main Score */}
          <div className="text-5xl md:text-6xl font-bold font-mono text-primary mb-2 animate-score-glow">
            {Math.round(score)}
          </div>
          
          {/* Grade with Colored Pill Background */}
          <div className="mb-4">
            <span
              className="inline-block px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-3xl md:text-4xl font-bold font-sans shadow-lg text-white"
              style={{ backgroundColor: gradeColorHex }}
            >
              {grade}
            </span>
          </div>
          
          {/* Week Label */}
          {weekLabel && (
            <div className="text-sm text-muted-foreground px-3 py-1 bg-muted/20 rounded-full inline-block">
              Week of {weekLabel}
            </div>
          )}
        </div>

        {/* Right: Drivers */}
        {drivers && (
          <div className="lg:w-2/3 lg:border-l lg:border-border/50 lg:pl-8 mt-6 lg:mt-0">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
              Score Drivers
            </h4>
            <div className="space-y-3">
              {parseDrivers(drivers).map((d, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 text-sm p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-[#2DD4BF] flex-shrink-0" />
                  <span className="text-foreground/90">{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Re-export for backward compatibility
export { getGradeFromScore as getGradeForScore } from '@/utils/scoring';
