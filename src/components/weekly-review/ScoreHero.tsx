import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SupabaseWeekScorecard } from '@/hooks/useSupabaseWeekData';
import { getGradeFromScore } from '@/utils/scoring';
import { cn } from '@/lib/utils';

interface ScoreHeroProps {
  scorecard: SupabaseWeekScorecard;
  prevScorecard: SupabaseWeekScorecard | null;
  oneLiner: string;
}

const GRADE_BG: Record<string, string> = {
  A: 'bg-signal-green',
  B: 'bg-primary',
  C: 'bg-gold',
  D: 'bg-orange-400',
  F: 'bg-destructive',
};

const GRADE_TEXT: Record<string, string> = {
  A: 'text-signal-green',
  B: 'text-primary',
  C: 'text-gold',
  D: 'text-orange-400',
  F: 'text-destructive',
};

function TrendDelta({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  const delta = current - previous;
  if (delta === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0 pts</span>;
  const isUp = delta > 0;
  return (
    <span className={cn('text-xs flex items-center gap-0.5', isUp ? 'text-signal-green' : 'text-destructive')}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{delta} pts
    </span>
  );
}

function PillarMini({ name, score, prevScore }: { name: string; score: number | null; prevScore: number | null }) {
  const grade = score != null ? getGradeFromScore(score) : null;
  const bgClass = grade ? GRADE_BG[grade] || GRADE_BG.F : 'bg-muted';

  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3 min-w-[100px] flex-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{name}</div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-mono font-bold text-foreground">{score ?? '—'}</span>
        {grade ? (
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold text-white', bgClass)}>
            {grade}
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-muted-foreground bg-muted">
            N/A
          </span>
        )}
      </div>
      {score != null && <TrendDelta current={score} previous={prevScore} />}
    </div>
  );
}

export function ScoreHero({ scorecard, prevScorecard, oneLiner }: ScoreHeroProps) {
  const overallGrade = scorecard.overall_score != null ? getGradeFromScore(scorecard.overall_score) : null;
  const overallBgClass = overallGrade ? GRADE_BG[overallGrade] || GRADE_BG.F : undefined;
  const isLowConfidence = (scorecard.confidence ?? 100) < 50;

  return (
    <div className={cn(
      "bg-card border rounded-xl p-4 md:p-6 bg-gradient-to-r from-primary/5 to-transparent",
      isLowConfidence ? "border-orange-400/40" : "border-primary/20"
    )}>
      {/* Low confidence banner */}
      {isLowConfidence && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <span className="text-orange-400 text-xs font-medium">⚠ Limited data — POS data may be missing for this week. Scores reflect only available signals.</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Overall score */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("text-5xl md:text-7xl font-mono font-bold leading-none", isLowConfidence ? "text-muted-foreground" : "text-foreground")}>
              {scorecard.overall_score ?? '—'}
            </span>
            {overallGrade && overallBgClass && (
              <span className={cn('px-3 py-1.5 rounded-lg text-2xl md:text-3xl font-bold text-white', overallBgClass, isLowConfidence && 'opacity-50')}>
                {overallGrade}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <TrendDelta
              current={scorecard.overall_score}
              previous={prevScorecard?.overall_score ?? null}
            />
          </div>
        </div>

        {/* Vertical divider (desktop only) */}
        <div className="hidden lg:block border-l border-border/50 self-stretch" />

        {/* Right: 4 pillar mini-cards */}
        <div className="flex gap-2 flex-wrap">
          <PillarMini name="Revenue" score={scorecard.revenue_score} prevScore={prevScorecard?.revenue_score ?? null} />
          <PillarMini name="Labor" score={scorecard.labor_score} prevScore={prevScorecard?.labor_score ?? null} />
          <PillarMini name="Operations" score={scorecard.operations_score} prevScore={prevScorecard?.operations_score ?? null} />
          <PillarMini name="Guest Exp" score={scorecard.guest_score} prevScore={prevScorecard?.guest_score ?? null} />
        </div>
      </div>

      {/* One-liner */}
      <p className="text-sm text-muted-foreground mt-3 border-t border-border/50 pt-3">
        {oneLiner}
      </p>
    </div>
  );
}
