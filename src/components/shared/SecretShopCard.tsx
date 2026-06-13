import { SecretShopAudit } from '@/types/venue';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface SecretShopCardProps {
  audit: SecretShopAudit;
}

export const SecretShopCard = ({ audit }: SecretShopCardProps) => {
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-signal-green';
    if (score >= 70) return 'text-gold';
    return 'text-destructive';
  };

  return (
    <div className="card-metric p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-muted-foreground text-sm">Shop Date: </span>
          <span className="text-foreground">{formatDate(audit.shop_date)}</span>
        </div>
        <div className={cn('font-mono text-2xl font-bold', getScoreColor(audit.total_score_pct))}>
          {audit.total_score_pct}%
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Greeting', score: audit.greeting_score },
          { label: 'Service', score: audit.service_score },
          { label: 'Food', score: audit.food_score },
          { label: 'Clean', score: audit.cleanliness_score },
        ].map(item => (
          <div key={item.label} className="text-center">
            <div className={cn(
              'font-mono text-lg',
              item.score >= 80 ? 'text-signal-green' : item.score >= 60 ? 'text-gold' : 'text-destructive'
            )}>
              {item.score}
            </div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Failed Areas */}
      {audit.failed_areas && (
        <div className="mb-3">
          <span className="text-xs text-destructive uppercase tracking-wide">Failed: </span>
          <span className="text-sm text-foreground">{audit.failed_areas}</span>
        </div>
      )}

      {/* Positives */}
      {audit.positives && (
        <div className="mb-3">
          <span className="text-xs text-signal-green uppercase tracking-wide">Positives: </span>
          <span className="text-sm text-foreground">{audit.positives}</span>
        </div>
      )}

      {/* Quote */}
      {audit.notable_quotes && (
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3 mt-4">
          {audit.notable_quotes}
        </blockquote>
      )}
    </div>
  );
};
