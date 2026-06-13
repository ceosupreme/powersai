import { SecretShopAudit } from '@/types/venue';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface SecretShopDetailCardProps {
  audit: SecretShopAudit;
}

import { getGradeFromScore, getGradeColor, getGradeBackgroundClass } from '@/utils/scoring';

const getScoreColorLocal = (score: number) => {
  if (score >= 85) return 'text-signal-green';
  if (score >= 70) return 'text-gold';
  return 'text-destructive';
};

const getBusinessLevelColor = (level?: string) => {
  switch (level) {
    case 'Slammed': return 'bg-destructive/20 text-destructive';
    case 'Busy': return 'bg-gold/20 text-gold';
    case 'Moderate': return 'bg-blue/20 text-blue';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const SecretShopDetailCard = ({ audit }: SecretShopDetailCardProps) => {
  const [isNarrativeOpen, setIsNarrativeOpen] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'EEEE, MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Convert decimal to percentage (API returns 0.8778 for 87.78%)
  const scorePercent = audit.total_score_pct * 100;
  const priorScorePercent = audit.prior_shop_score_pct !== undefined && audit.prior_shop_score_pct !== null 
    ? audit.prior_shop_score_pct * 100 
    : null;
  
  const grade = getGradeFromScore(scorePercent);
  const gradeColorClass = getGradeBackgroundClass(grade);
  
  // Calculate trend
  const hasPriorScore = priorScorePercent !== null;
  const scoreDiff = hasPriorScore ? scorePercent - priorScorePercent : 0;

  return (
    <div className="card-metric p-5 space-y-5">
      {/* Header with Icon */}
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Secret Shop Details</h3>
      </div>

      {/* Shop Info Row */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Date: </span>
          <span className="text-foreground">{formatDate(audit.shop_date)}</span>
        </div>
        
        {audit.arrival_time && audit.departure_time && (
          <div>
            <span className="text-muted-foreground">Time: </span>
            <span className="text-foreground">
              {audit.arrival_time} - {audit.departure_time}
              {audit.duration_minutes && ` (${audit.duration_minutes} min)`}
            </span>
          </div>
        )}
        
        {audit.server_name && (
          <div>
            <span className="text-muted-foreground">Server: </span>
            <span className="text-foreground">{audit.server_name}</span>
          </div>
        )}
        
        {audit.amount_spent !== undefined && (
          <div>
            <span className="text-muted-foreground">Spent: </span>
            <span className="text-foreground font-mono">${audit.amount_spent.toFixed(2)}</span>
          </div>
        )}
        
        {audit.party_size !== undefined && (
          <div>
            <span className="text-muted-foreground">Party: </span>
            <span className="text-foreground">{audit.party_size}</span>
          </div>
        )}
        
        {audit.business_level && (
          <Badge variant="outline" className={cn('text-xs', getBusinessLevelColor(audit.business_level))}>
            {audit.business_level}
          </Badge>
        )}
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4">
          <div className={cn('font-mono text-4xl font-bold', getScoreColorLocal(scorePercent))}>
            {scorePercent.toFixed(1)}%
          </div>
          {audit.total_points !== undefined && audit.max_points !== undefined && (
            <span className="text-muted-foreground text-lg">
              ({audit.total_points}/{audit.max_points})
            </span>
          )}
          
          {/* Trend Arrow */}
          {hasPriorScore && (
            <div className={cn('flex items-center gap-1 text-sm', 
              scoreDiff > 0 ? 'text-signal-green' : scoreDiff < 0 ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {scoreDiff > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : scoreDiff < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span>{scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        {/* Grade Badge */}
        <div className={cn('text-2xl font-bold px-4 py-2 rounded-lg', gradeColorClass)}>
          {grade}
        </div>
      </div>

      {/* Category Score Breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Greeting', score: audit.greeting_score },
          { label: 'Service', score: audit.service_score },
          { label: 'Food', score: audit.food_score },
          { label: 'Cleanliness', score: audit.cleanliness_score },
        ].map(item => (
          <div key={item.label} className="text-center p-3 bg-muted/20 rounded-lg">
            <div className={cn(
              'font-mono text-xl font-semibold',
              item.score >= 80 ? 'text-signal-green' : item.score >= 60 ? 'text-gold' : 'text-destructive'
            )}>
              {item.score}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Failed Areas */}
      {audit.failed_areas && (
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <span className="text-xs text-destructive uppercase tracking-wide font-semibold">Failed Areas</span>
          <p className="text-sm text-foreground mt-1">{audit.failed_areas}</p>
        </div>
      )}

      {/* Positives */}
      {audit.positives && (
        <div className="p-3 bg-signal-green/10 rounded-lg border border-signal-green/20">
          <span className="text-xs text-signal-green uppercase tracking-wide font-semibold">Positives</span>
          <p className="text-sm text-foreground mt-1">{audit.positives}</p>
        </div>
      )}

      {/* Notable Quote */}
      {audit.notable_quotes && (
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
          "{audit.notable_quotes}"
        </blockquote>
      )}

      {/* Expandable Shopper Narrative */}
      {audit.summary_narrative && (
        <Collapsible open={isNarrativeOpen} onOpenChange={setIsNarrativeOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium text-foreground">Full Shopper Narrative</span>
            {isNarrativeOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <blockquote className="text-sm text-foreground/90 leading-relaxed p-4 bg-card border border-border rounded-lg">
              {audit.summary_narrative}
            </blockquote>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
