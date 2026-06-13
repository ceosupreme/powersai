import { useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  ClipboardList,
  Plus,
  Lightbulb,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ActionItemCard } from './ActionItemCard';
import { EmployeeNameLink } from '@/components/employees/EmployeeNameLink';
import type { InsightV2, SeverityV2, PillarV2 } from '@/types/insights-v2';
import { getPillarDisplayName } from '@/types/insights-v2';

interface InsightCardV2Props {
  insight: InsightV2;
  expanded?: boolean;
  onToggle?: () => void;
  onApproveAction?: (actionId: string, assigneeId?: string) => Promise<void>;
  onRejectAction?: (actionId: string) => Promise<void>;
  isProcessing?: boolean;
}

// Severity styling configurations
const severityConfig: Record<SeverityV2, {
  icon: typeof AlertTriangle;
  badgeClass: string;
  borderClass: string;
  glowClass: string;
}> = {
  Critical: {
    icon: AlertTriangle,
    badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
    borderClass: 'border-l-4 border-l-red-500',
    glowClass: 'hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]',
  },
  High: {
    icon: AlertTriangle,
    badgeClass: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    borderClass: 'border-l-4 border-l-orange-500',
    glowClass: 'hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]',
  },
  Medium: {
    icon: AlertCircle,
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    borderClass: 'border-l-4 border-l-yellow-500',
    glowClass: 'hover:shadow-[0_0_15px_rgba(234,179,8,0.15)]',
  },
  Low: {
    icon: Info,
    badgeClass: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    borderClass: 'border-l-4 border-l-slate-500',
    glowClass: 'hover:shadow-[0_0_15px_rgba(100,116,139,0.15)]',
  },
  Info: {
    icon: Info,
    badgeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    borderClass: 'border-l-4 border-l-blue-500',
    glowClass: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]',
  },
};

export const InsightCardV2 = ({
  insight,
  expanded = false,
  onToggle,
  onApproveAction,
  onRejectAction,
  isProcessing,
}: InsightCardV2Props) => {
  const config = severityConfig[insight.severity] || severityConfig.Medium;
  const SeverityIcon = config.icon;
  const actionCount = insight.actions?.length || 0;
  const proposedCount = insight.actions?.filter(a => a.approval_status === 'Proposed').length || 0;

  // Parse facts into bullet points
  const factsList = insight.facts?.split('\n').filter(Boolean).map(f => f.trim()) || [];

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <div 
        className={`
          bg-card border border-border/50 rounded-xl overflow-hidden
          ${config.borderClass} ${config.glowClass}
          transition-all duration-200
        `}
      >
        {/* Collapsed Header - Always Visible */}
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              {/* Left: Icon + Severity + Pillar */}
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                <SeverityIcon className="w-5 h-5 text-current opacity-80 flex-shrink-0" />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${config.badgeClass}`}>
                  {insight.severity}
                </span>
                {insight.insight_mode === 'weekly' && !insight.period_label && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                    Weekly
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {getPillarDisplayName(insight.pillar)}
                </span>
                {/* Period pill — prominent for week-decoupled (e.g. inventory) insights */}
                {insight.period_label && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-[0_0_0_1px_rgba(168,85,247,0.1)]"
                    title={insight.period_start && insight.period_end ? `Inventory period: ${insight.period_start} to ${insight.period_end}` : undefined}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{insight.period_label}</span>
                    <span className="text-[10px] uppercase tracking-wide opacity-80 ml-0.5">Inventory Period</span>
                  </span>
                )}
              </div>

              {/* Right: Expand/Collapse */}
              <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground flex-shrink-0">
                {expanded ? (
                  <>Less <ChevronUp className="w-4 h-4 ml-1" /></>
                ) : (
                  <>More <ChevronDown className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>

            {/* Title & Summary */}
            <div className="mt-2">
              <h4 className="font-semibold text-foreground">{insight.title}</h4>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {insight.summary}
              </p>
            </div>

            {/* Employee link chip */}
            {insight.employee_id && insight.employee_name && (
              <div className="mt-2">
                <EmployeeNameLink
                  employeeId={insight.employee_id}
                  name={insight.employee_name}
                />
              </div>
            )}

            {/* Action Count */}
            {actionCount > 0 && !expanded && (
              <div className="mt-3 text-xs text-muted-foreground">
                {proposedCount > 0 
                  ? `${proposedCount} action${proposedCount !== 1 ? 's' : ''} proposed`
                  : `${actionCount} action${actionCount !== 1 ? 's' : ''}`
                }
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border/30">
            {/* WHAT HAPPENED Section */}
            {insight.detail && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-gold" />
                  <span className="text-sm font-semibold text-gold uppercase">What Happened</span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                  {insight.detail}
                </p>
              </div>
            )}

            {/* EVIDENCE Section */}
            {factsList.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-400 uppercase">Evidence</span>
                </div>
                <ul className="space-y-1 pl-5">
                  {factsList.map((fact, idx) => (
                    <li key={idx} className="text-sm text-slate-300 list-disc">
                      {fact.replace(/^[•\-\*]\s*/, '')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata Row */}
            {(insight.source_type || insight.source_date || insight.estimated_impact) && (
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground mb-4 py-2 border-y border-border/30">
                <div className="flex items-center gap-3">
                  {insight.source_type && (
                    <span>Source: {insight.source_type}</span>
                  )}
                  {insight.source_date && !insight.period_label && (
                    <span className="text-foreground/70">
                      Incident: {new Date(insight.source_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                {insight.estimated_impact && (
                  <span>Impact: {insight.estimated_impact}</span>
                )}
              </div>
            )}

            {/* ACTIONS Section */}
            {actionCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-foreground">
                    ACTIONS ({actionCount})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-primary hover:text-primary/80"
                    disabled
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Action
                  </Button>
                </div>

                <div className="space-y-3">
                  {insight.actions?.map(action => (
                    <ActionItemCard
                      key={action.id}
                      action={action}
                      onApprove={onApproveAction}
                      onReject={onRejectAction}
                      isProcessing={isProcessing}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
