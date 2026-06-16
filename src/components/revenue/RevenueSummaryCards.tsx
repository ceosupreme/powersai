import { Card } from "@/components/ui/card";
import { ChannelRevenue, REVENUE_TYPE_LABELS, formatMonth, formatUSD } from "@/hooks/useChannelRevenue";

function currentMonthFirst(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function prevMonthFirst(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function RevenueSummaryCards({ items }: { items: ChannelRevenue[] }) {
  const cur = currentMonthFirst();
  const prev = prevMonthFirst();

  const sumFor = (month: string) =>
    items.filter((i) => i.period_month === month).reduce((s, i) => s + Number(i.amount), 0);

  const byTypeCurrent = items
    .filter((i) => i.period_month === cur)
    .reduce<Record<string, number>>((acc, i) => {
      acc[i.revenue_type] = (acc[i.revenue_type] ?? 0) + Number(i.amount);
      return acc;
    }, {});

  const curTotal = sumFor(cur);
  const prevTotal = sumFor(prev);
  const typeEntries = Object.entries(byTypeCurrent).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {formatMonth(cur)} (This Month)
        </div>
        <div className="text-2xl font-semibold mt-1">{formatUSD(curTotal)}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {formatMonth(prev)} (Last Month)
        </div>
        <div className="text-2xl font-semibold mt-1">{formatUSD(prevTotal)}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          By Type — {formatMonth(cur)}
        </div>
        {typeEntries.length === 0 ? (
          <div className="text-sm text-muted-foreground mt-2">—</div>
        ) : (
          <div className="mt-2 space-y-1">
            {typeEntries.map(([t, v]) => (
              <div key={t} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{REVENUE_TYPE_LABELS[t] ?? t}</span>
                <span className="font-medium">{formatUSD(v)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}