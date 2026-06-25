import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import type { FoundationCategoryScore } from './deriveFoundationScores';

function band(score: number) {
  if (score >= 85) return { text: 'text-emerald-600', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' };
  if (score >= 70) return { text: 'text-amber-600', bg: 'bg-amber-500/15', border: 'border-amber-500/40' };
  return { text: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/40' };
}

export const FoundationCategoryCard = ({ cat }: { cat: FoundationCategoryScore }) => {
  if (cat.unscored || cat.score === null) {
    return (
      <Card className="p-4 border border-border/60 bg-card/40">
        <div className="flex items-start justify-between gap-2">
          <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
            No data yet
          </Badge>
        </div>
        <div className="mt-3 text-xs font-medium text-foreground leading-tight min-h-[2.25rem]">
          {cat.label}
        </div>
        <div className="mt-2 text-2xl font-bold text-muted-foreground">—</div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          {cat.total} item{cat.total === 1 ? '' : 's'} · awaiting answers
        </div>
      </Card>
    );
  }
  const b = band(cat.score);
  return (
    <Card className={`p-4 border ${b.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`p-1.5 rounded-md ${b.bg} ${b.text}`}>
          <ShieldCheck className="w-4 h-4" />
        </div>
        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
          {cat.satisfied}/{cat.total} done
        </Badge>
      </div>
      <div className="mt-3 text-xs font-medium text-foreground leading-tight min-h-[2.25rem]">
        {cat.label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${b.text}`}>{cat.score}</div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {cat.missing} missing · {cat.partial} partial
      </div>
    </Card>
  );
};