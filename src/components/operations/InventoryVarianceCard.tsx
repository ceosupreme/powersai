import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Package, TrendingDown, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useLatestInventoryReport, useInventoryItems } from '@/hooks/useInventoryData';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export const InventoryVarianceCard = () => {
  const { supabaseBarId } = useApp();
  const { data: report, isLoading: reportLoading } = useLatestInventoryReport(supabaseBarId || undefined);
  const { data: items = [], isLoading: itemsLoading } = useInventoryItems(report?.id);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  if (reportLoading || itemsLoading) return null;

  if (!report) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-muted-foreground" />
            Inventory Variance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No inventory data yet. Upload reports from Admin → Settings → Inventory.
          </p>
        </CardContent>
      </Card>
    );
  }

  const categoryTotals = items.filter(i => i.is_category_total);
  const topProblems = items
    .filter(i => !i.is_category_total && i.missing_cost !== null && i.missing_cost < 0)
    .sort((a, b) => (a.missing_cost ?? 0) - (b.missing_cost ?? 0))
    .slice(0, 5);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const ratingColor = (rating: number | null) => {
    if (!rating) return 'text-muted-foreground';
    if (rating >= 95) return 'text-green-500';
    if (rating >= 85) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Inventory Variance
          </CardTitle>
          {report.sculpture_rating && (
            <Badge variant="outline" className={`${ratingColor(report.sculpture_rating)} border-current`}>
              {report.sculpture_rating}% Rating
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {report.period_start} → {report.period_end}
          {report.total_missing_cost !== null && (
            <> · Variance: <span className={report.total_missing_cost < 0 ? 'text-destructive' : 'text-green-500'}>
              ${report.total_missing_cost.toFixed(2)}
            </span></>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Problem Items */}
        {topProblems.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Top Variances
            </p>
            <div className="space-y-1">
              {topProblems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-destructive/5 border border-destructive/10">
                  <span className="text-sm text-foreground truncate flex-1">{item.item_name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.missing_pct && (
                      <span className="text-xs text-muted-foreground">{item.missing_pct}%</span>
                    )}
                    <span className="text-sm font-medium text-destructive">
                      ${item.missing_cost?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {categoryTotals.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> By Category
            </p>
            <div className="space-y-1">
              {categoryTotals.map(cat => {
                const isExpanded = expandedCategories.has(cat.item_name);
                const categoryItems = items.filter(
                  i => !i.is_category_total && i.category === cat.category
                );

                return (
                  <Collapsible key={cat.id} open={isExpanded} onOpenChange={() => toggleCategory(cat.item_name)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-1.5">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          <span className="text-sm font-medium text-foreground">{cat.category || cat.item_name}</span>
                          {cat.sculpture_rating && (
                            <span className={`text-xs ${ratingColor(cat.sculpture_rating)}`}>{cat.sculpture_rating}%</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {cat.pour_cost && cat.ideal_pour_cost && (
                            <span className="text-muted-foreground">
                              PC: {cat.pour_cost}% vs {cat.ideal_pour_cost}%
                            </span>
                          )}
                          {cat.missing_cost !== null && (
                            <span className={cat.missing_cost < 0 ? 'text-destructive font-medium' : 'text-green-500 font-medium'}>
                              ${cat.missing_cost.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-5 space-y-0.5 pb-1">
                        {categoryItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between py-1 px-2 text-xs">
                            <span className="text-muted-foreground truncate flex-1">{item.item_name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.missing_pct && (
                                <span className="text-muted-foreground">{item.missing_pct}%</span>
                              )}
                              {item.missing_cost !== null && (
                                <span className={item.missing_cost < 0 ? 'text-destructive' : 'text-green-500'}>
                                  ${item.missing_cost.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
