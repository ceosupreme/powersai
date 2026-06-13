import { Award, AlertTriangle } from 'lucide-react';
import { useEmployeeInsights } from '@/hooks/useEmployeeInsights';

interface Props {
  employeeId: string | undefined;
  windowDays?: number;
}

const fmt = (s: string | null) => {
  if (!s) return '—';
  // Manual parse to avoid UTC offset bugs
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${m}/${d}`;
};

const PillRow = ({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: string;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-lg ${tone}`}>{icon}</div>
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
    </div>
    <div className="text-2xl font-bold">{count}</div>
  </div>
);

export const EmployeeWinsConcernsPanel = ({ employeeId, windowDays = 90 }: Props) => {
  const { data, isLoading } = useEmployeeInsights(employeeId, windowDays);

  const wins = data?.wins || [];
  const concerns = data?.concerns || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <PillRow
          icon={<Award className="w-4 h-4" />}
          label={`Wins · last ${windowDays}d`}
          count={wins.length}
          tone="bg-emerald-500/15 text-emerald-400"
        />
        <div className="mt-3 space-y-2">
          {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {!isLoading && wins.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No wins flagged in this window yet.
            </div>
          )}
          {wins.slice(0, 5).map((w) => (
            <div
              key={w.id}
              className="text-sm border-l-2 border-emerald-500/40 pl-3 py-0.5"
            >
              <div className="font-medium text-foreground line-clamp-1" title={w.title}>
                {w.title}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {fmt(w.source_date)} · {w.pillar || 'General'}
              </div>
            </div>
          ))}
          {wins.length > 5 && (
            <div className="text-[11px] text-muted-foreground">
              +{wins.length - 5} more
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <PillRow
          icon={<AlertTriangle className="w-4 h-4" />}
          label={`Concerns · last ${windowDays}d`}
          count={concerns.length}
          tone="bg-rose-500/15 text-rose-400"
        />
        <div className="mt-3 space-y-2">
          {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {!isLoading && concerns.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No concerns flagged in this window.
            </div>
          )}
          {concerns.slice(0, 5).map((c) => (
            <div
              key={c.id}
              className="text-sm border-l-2 border-rose-500/40 pl-3 py-0.5"
            >
              <div className="font-medium text-foreground line-clamp-1" title={c.title}>
                {c.title}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {fmt(c.source_date)} · {c.pillar || 'General'}
                {c.severity ? ` · ${c.severity}` : ''}
              </div>
            </div>
          ))}
          {concerns.length > 5 && (
            <div className="text-[11px] text-muted-foreground">
              +{concerns.length - 5} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
