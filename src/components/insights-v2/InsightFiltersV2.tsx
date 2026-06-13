import { DollarSign, Users, Settings, Star, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountBadge } from '@/components/shared/CountBadge';
import type { InsightV2, PillarV2, SeverityV2 } from '@/types/insights-v2';

interface InsightFiltersV2Props {
  selectedPillar: PillarV2 | null;
  onPillarChange: (pillar: PillarV2 | null) => void;
  severityFilter: SeverityV2[];
  onSeverityChange: (severities: SeverityV2[]) => void;
  sortBy: 'severity' | 'newest' | 'pillar' | 'dueDate';
  onSortChange: (sort: 'severity' | 'newest' | 'pillar' | 'dueDate') => void;
  insights?: InsightV2[];
}

const pillars: { key: PillarV2 | null; label: string; icon: typeof DollarSign }[] = [
  { key: null, label: 'All', icon: Settings },
  { key: 'Revenue', label: 'Revenue', icon: DollarSign },
  { key: 'Labor', label: 'Labor', icon: Users },
  { key: 'Operations', label: 'Operations', icon: Settings },
  { key: 'Guest', label: 'Guest', icon: Star },
  { key: 'Marketing', label: 'Marketing', icon: Megaphone },
];

const severities: SeverityV2[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

const severityColors: Record<SeverityV2, string> = {
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  High: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
  Low: 'bg-slate-500/20 text-slate-400 border-slate-500/30 hover:bg-slate-500/30',
  Info: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
};

export const InsightFiltersV2 = ({
  selectedPillar,
  onPillarChange,
  severityFilter,
  onSeverityChange,
  sortBy,
  onSortChange,
  insights = [],
}: InsightFiltersV2Props) => {
  // Count insights per pillar
  const pillarCounts = pillars.reduce((acc, p) => {
    acc[p.key ?? 'all'] = p.key 
      ? insights.filter(i => i.pillar === p.key).length
      : insights.length;
    return acc;
  }, {} as Record<string, number>);

  // Toggle severity in filter
  const toggleSeverity = (severity: SeverityV2) => {
    if (severityFilter.includes(severity)) {
      onSeverityChange(severityFilter.filter(s => s !== severity));
    } else {
      onSeverityChange([...severityFilter, severity]);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Pillar Tabs */}
      <div className="flex flex-wrap gap-2">
        {pillars.map(({ key, label, icon: Icon }) => {
          const isActive = selectedPillar === key;
          const count = pillarCounts[key ?? 'all'] || 0;
          
          return (
            <Button
              key={key ?? 'all'}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onPillarChange(key)}
              className={`
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <Icon className="w-4 h-4 mr-1.5" />
              {label}
              <CountBadge count={count} variant="subtle" className={`ml-1.5 ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`} />
            </Button>
          );
        })}
      </div>

      {/* Severity Checkboxes + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Show:</span>
        {severities.map(severity => {
          const isChecked = severityFilter.includes(severity);
          return (
            <button
              key={severity}
              onClick={() => toggleSeverity(severity)}
              className={`
                text-xs px-2.5 py-1 rounded-full border transition-colors
                ${isChecked ? severityColors[severity] : 'bg-muted/30 text-muted-foreground border-border/50 opacity-50'}
              `}
            >
              {isChecked ? '☑' : '☐'} {severity}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
            className="text-sm bg-muted/50 border border-border/50 rounded-lg px-3 py-1.5 text-foreground"
          >
            <option value="severity">Severity</option>
            <option value="newest">Newest</option>
            <option value="pillar">Pillar</option>
            <option value="dueDate">Due Date</option>
          </select>
        </div>
      </div>
    </div>
  );
};
