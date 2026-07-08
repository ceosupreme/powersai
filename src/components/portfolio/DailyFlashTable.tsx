import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { formatCurrency, formatPercent } from '@/utils/formatting';
import { DailyFlashVenue } from '@/hooks/useDailyFlash';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DailyFlashTableProps {
  venues: DailyFlashVenue[];
  yesterday: string;
  lastUpdated: string | null;
}

function HitMissCell({ hit, children }: { hit: boolean | null; children: React.ReactNode }) {
  if (hit === null) return (
    <td className="px-3 py-2.5 text-sm text-foreground">{children}</td>
  );
  return (
    <td className={cn('px-3 py-2.5 text-sm font-medium', hit ? 'text-emerald-400' : 'text-destructive')}>
      {children} {hit ? '✅' : '🔴'}
    </td>
  );
}

export function DailyFlashTable({ venues, yesterday, lastUpdated }: DailyFlashTableProps) {
  const [open, setOpen] = useState(true);

  const formattedDate = (() => {
    try { return format(new Date(yesterday + 'T12:00:00'), 'EEE, MMM d'); } 
    catch { return yesterday; }
  })();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Daily Flash</h2>
            <span className="text-sm text-muted-foreground">— {formattedDate}</span>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Updated {format(new Date(lastUpdated), 'h:mm a')}
              </span>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Project</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Net Sales</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">vs Target</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Labor %</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Comps %</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {venues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-sm">
                      No data available for yesterday
                    </td>
                  </tr>
                ) : (
                  venues.map(v => {
                    const vsTarget = v.netSales != null && v.dailyRevenueTarget != null && v.dailyRevenueTarget > 0
                      ? ((v.netSales - v.dailyRevenueTarget) / v.dailyRevenueTarget) * 100
                      : null;

                    return (
                      <tr key={v.barId} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 text-sm font-medium text-foreground">{v.barName}</td>
                        <td className="px-3 py-2.5 text-sm text-foreground">
                          {v.netSales != null ? formatCurrency(v.netSales) : '--'}
                        </td>
                        <HitMissCell hit={v.revenueHit}>
                          {vsTarget != null ? `${vsTarget >= 0 ? '+' : ''}${formatPercent(vsTarget)}` : '--'}
                        </HitMissCell>
                        <HitMissCell hit={v.laborHit}>
                          {v.laborPct != null ? formatPercent(v.laborPct) : '--'}
                        </HitMissCell>
                        <HitMissCell hit={v.compsHit}>
                          {v.compsPct != null ? formatPercent(v.compsPct) : '--'}
                        </HitMissCell>
                        <td className="px-3 py-2.5 text-sm">
                          {v.alertCount > 0 ? (
                            <span className="text-destructive font-medium">{v.alertCount} 🟠</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
