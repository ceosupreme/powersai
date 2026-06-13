import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ScoreBreakdownCardProps {
  eventScore?: number;
  socialScore?: number;
  contentScore?: number;
  promoScore?: number;
}

const getScoreColor = (score: number) => {
  if (score >= 5) return 'bg-signal-green';
  if (score >= 4) return 'bg-emerald-400';
  if (score >= 3) return 'bg-gold';
  if (score >= 2) return 'bg-orange-400';
  return 'bg-destructive';
};

const getScoreTextColor = (score: number) => {
  if (score >= 5) return 'text-signal-green';
  if (score >= 4) return 'text-emerald-400';
  if (score >= 3) return 'text-gold';
  if (score >= 2) return 'text-orange-400';
  return 'text-destructive';
};

interface ScoreRowProps {
  label: string;
  score?: number;
  maxScore: number;
}

const ScoreRow = ({ label, score, maxScore }: ScoreRowProps) => {
  const displayScore = score ?? 0;
  const percentage = (displayScore / maxScore) * 100;
  const isPending = score === undefined || score === null;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-semibold",
          isPending ? "text-muted-foreground" : getScoreTextColor(displayScore)
        )}>
          {isPending ? 'Pending' : `${displayScore}/${maxScore}`}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div 
          className={cn(
            "h-full transition-all duration-500",
            isPending ? "bg-muted" : getScoreColor(displayScore)
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const ScoreBreakdownCard = ({
  eventScore,
  socialScore,
  contentScore,
  promoScore,
}: ScoreBreakdownCardProps) => {
  return (
    <Card className="card-metric animate-fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScoreRow label="Event Performance" score={eventScore} maxScore={5} />
        <ScoreRow label="Social Media Activity" score={socialScore} maxScore={5} />
        <ScoreRow label="Content Capture" score={contentScore} maxScore={5} />
        <ScoreRow label="Promo Effectiveness" score={promoScore} maxScore={5} />
      </CardContent>
    </Card>
  );
};
