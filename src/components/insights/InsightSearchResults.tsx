import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  summary: string | null;
  pillar: string | null;
  severity: string | null;
  status: string | null;
  source_date: string | null;
  bar_id: string | null;
  created_at: string;
}

interface InsightSearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onClickResult: (result: SearchResult) => void;
  onRestore: (id: string) => void;
  restoringId: string | null;
  venueNameMap?: Map<string, string>;
}

const severityDotClass: Record<string, string> = {
  Critical: 'bg-destructive',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-emerald-500',
  Info: 'bg-blue-400',
};

const statusBadgeVariant = (status: string | null) => {
  if (status === 'Dismissed') return 'secondary';
  if (status === 'Consolidated') return 'outline';
  return 'default';
};

export const InsightSearchResults = ({
  results,
  isLoading,
  query,
  onClickResult,
  onRestore,
  restoringId,
  venueNameMap,
}: InsightSearchResultsProps) => {
  if (query.length < 2) return null;

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Searching…</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">No insights found for "{query}"</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
      {results.map(result => {
        const isDismissed = result.status === 'Dismissed';
        const isConsolidated = result.status === 'Consolidated';
        const isInactive = isDismissed || isConsolidated;
        const venueName = result.bar_id ? venueNameMap?.get(result.bar_id) : undefined;

        return (
          <button
            key={result.id}
            onClick={() => onClickResult(result)}
            className={cn(
              'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3',
              isInactive && 'opacity-60'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                severityDotClass[result.severity || 'Medium'] || 'bg-muted-foreground'
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground truncate">
                  {result.title}
                </span>
                {result.pillar && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {result.pillar}
                  </Badge>
                )}
                {isInactive && (
                  <Badge variant={statusBadgeVariant(result.status)} className="text-[10px] px-1.5 py-0">
                    {result.status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {result.source_date && (
                  <span className="text-xs text-muted-foreground">{result.source_date}</span>
                )}
                {venueName && (
                  <span className="text-xs text-muted-foreground">· {venueName}</span>
                )}
              </div>
            </div>
            {isDismissed && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(result.id);
                }}
                disabled={restoringId === result.id}
              >
                {restoringId === result.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Restore
                  </>
                )}
              </Button>
            )}
          </button>
        );
      })}
    </div>
  );
};
