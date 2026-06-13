import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wine } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useDrinkMixSummary } from '@/hooks/useDrinkMixSummary';
import { format, parseISO } from 'date-fns';

export const DrinkMixCard = () => {
  const { supabaseBarId } = useApp();
  const { data, isLoading } = useDrinkMixSummary(supabaseBarId || undefined);

  if (isLoading) return null;

  if (!data) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wine className="h-4 w-4 text-muted-foreground" />
            Drink Mix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No drink mix data yet. Upload from Admin → Settings → Inventory.
          </p>
        </CardContent>
      </Card>
    );
  }

  const fmt = (iso: string) => {
    try { return format(parseISO(iso), 'MMM d'); } catch { return iso; }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wine className="h-4 w-4 text-primary" />
            Drink Mix
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {fmt(data.period_start)} → {fmt(data.period_end)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-2xl font-semibold text-foreground">{data.active_plu_count.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Active PLUs</p>
          </div>
          <div className="text-muted-foreground/60">·</div>
          <div>
            <p className="text-2xl font-semibold text-foreground">{data.catalog_size.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
