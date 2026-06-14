import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowRight, ArrowUp, Database, Gauge, ShieldAlert, Sparkles } from 'lucide-react';
import { getScoreBand, opportunityIndex, readinessTone } from './scoreBands';
import type { PrimaryMetrics } from './deriveScores';

type Props = {
  data: PrimaryMetrics;
  onViewDataSources: () => void;
};

export const PrimaryMetricsRow = ({ data, onViewDataSources }: Props) => {
  const isGrowthScored = data.growthScore !== null;
  const band = getScoreBand(isGrowthScored ? data.growthScore! : 0);
  const oppIdx = opportunityIndex(data.opportunityLevel);
  const ready = readinessTone(data.readiness);
  const TrendIcon = data.growthTrend > 0 ? ArrowUp : data.growthTrend < 0 ? ArrowDown : ArrowRight;
  const trendColor = data.growthTrend > 0 ? 'text-emerald-600' : data.growthTrend < 0 ? 'text-destructive' : 'text-muted-foreground';
  // Inert Ops Gate sentinel: empty reason on Green Light = neutralized; hide the tile.
  const gateInert = data.readiness === 'Green Light' && data.readinessReason === '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {/* Growth Score */}
      <Card className={`p-5 border ${isGrowthScored ? band.border : 'border-border/60'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gauge className="w-3.5 h-3.5" /> Growth Score
          </div>
          {isGrowthScored ? (
            <Badge variant="outline" className={`text-[10px] ${band.bg} ${band.text} ${band.border}`}>
              {band.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
              No data yet
            </Badge>
          )}
        </div>
        {isGrowthScored ? (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <div className={`text-4xl font-bold ${band.text}`}>{data.growthScore}</div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
            <div className={`mt-2 inline-flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              {data.growthTrend > 0 ? '+' : ''}{data.growthTrend} vs last audit
            </div>
          </>
        ) : (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-4xl font-bold text-muted-foreground">—</div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Connect data sources to start scoring
            </div>
          </>
        )}
      </Card>

      {/* Revenue Opportunity */}
      <Card className="p-5 border border-emerald-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" /> Revenue Opportunity
          </div>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/40">
            {data.opportunityLevel}
          </Badge>
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground">{data.opportunityDollars}</div>
        <div className="text-[11px] text-muted-foreground">surfaced this audit</div>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= oppIdx ? 'bg-emerald-500' : 'bg-muted'}`}
            />
          ))}
        </div>
      </Card>

      {/* Data Confidence */}
      <Card className="p-5 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="w-3.5 h-3.5" /> Data Confidence
          </div>
          <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/40">
            {data.dataConfidence}
          </Badge>
        </div>
        <div className="mt-2 text-sm text-foreground">{data.dataConfidenceNote}</div>
        <Button
          variant="link"
          size="sm"
          className="px-0 mt-2 h-auto text-xs gap-1"
          onClick={onViewDataSources}
        >
          View Details <ArrowRight className="w-3 h-3" />
        </Button>
      </Card>

      {/* Operational Readiness Gate — hidden when inert (neutralized sentinel) */}
      {!gateInert && (
      <Card className={`p-5 border ${ready.border} ${ready.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="w-3.5 h-3.5" /> Ops Readiness Gate
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${ready.text}`}>
            <span className={`w-2 h-2 rounded-full ${ready.dot} animate-pulse`} />
            {data.readiness}
          </span>
        </div>
        <div className={`mt-2 text-base font-semibold ${ready.text}`}>{data.readiness}</div>
        <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{data.readinessReason}</div>
        <a
          href="#ops-gate-principle"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('ops-gate-principle')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          How this works <ArrowRight className="w-3 h-3" />
        </a>
      </Card>
      )}
    </div>
  );
};
