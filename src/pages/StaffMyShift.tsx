import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useStaffMyShiftData } from '@/hooks/useStaffMyShiftData';
import { isToday, format } from 'date-fns';

/* ── Inline Sub-components ─────────────────────────── */

function StatCard({ label, value, subtext, subtextColor = 'muted' }: {
  label: string; value: string; subtext: string;
  subtextColor?: 'green' | 'red' | 'yellow' | 'muted';
}) {
  const colorMap = {
    green: 'text-signal-green',
    red: 'text-destructive',
    yellow: 'text-yellow-400',
    muted: 'text-muted-foreground',
  };
  return (
    <div className="card-metric p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold text-foreground mt-1">{value}</div>
      <div className={cn('text-xs mt-1', colorMap[subtextColor])}>{subtext}</div>
    </div>
  );
}

function QuickLogButton({ icon, label, intent }: { icon: string; label: string; intent: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/logs/new?intent=${intent}`)}
      className="flex flex-col items-center gap-1 p-3 bg-muted hover:bg-muted/70 rounded-lg transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

function ScheduleRow({ date, off, start, end, isDouble }: {
  date: Date; off: boolean; start?: string; end?: string; isDouble?: boolean;
}) {
  const today = isToday(date);
  return (
    <div className={cn(
      'flex items-center justify-between p-3',
      today && 'bg-primary/10'
    )}>
      <span className="text-muted-foreground w-12 text-sm">{format(date, 'EEE')}</span>
      <span className={off ? 'text-muted-foreground' : 'text-foreground'}>
        {off ? 'OFF' : `${start} – ${end}`}
      </span>
      <div className="flex items-center gap-2 min-w-[70px] justify-end">
        {isDouble && <span className="text-yellow-400 text-xs">(Double)</span>}
        {today && <span className="text-primary text-xs">← Today</span>}
        {!isDouble && !today && <span className="w-1" />}
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────── */

export default function StaffMyShift() {
  const navigate = useNavigate();
  const {
    items86, shiftUpdatesList, equipmentAlerts,
    myTasks, completeTask,
    myStats, recognition, mySchedule,
    firstName, isFoh,
  } = useStaffMyShiftData();

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6 pb-20">
      {/* Greeting */}
      <h1 className="text-xl text-foreground font-semibold">👋 Hey {firstName}</h1>

      {/* Section 1: Shift Updates */}
      <section>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📢</span>
            <h2 className="font-semibold text-foreground">Shift Updates</h2>
          </div>
          <ul className="space-y-2">
            {items86.length > 0 && (
              <li className="flex items-start gap-2">
                <span>🚫</span>
                <span className="text-muted-foreground">86: {items86.join(', ')}</span>
              </li>
            )}
            {shiftUpdatesList.map((u, i) => (
              <li key={i} className="flex items-start gap-2">
                <span>{u.icon}</span>
                <span className="text-muted-foreground">{u.text}</span>
              </li>
            ))}
            {equipmentAlerts.map((a, i) => (
              <li key={`eq-${i}`} className="flex items-start gap-2">
                <span>🔧</span>
                <span className="text-muted-foreground">{a}</span>
              </li>
            ))}
            {items86.length === 0 && shiftUpdatesList.length === 0 && equipmentAlerts.length === 0 && (
              <li className="text-muted-foreground">No updates for this shift</li>
            )}
          </ul>
        </div>
      </section>

      {/* Section 2: My Tasks */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">✅</span>
          <h2 className="font-semibold text-foreground">My Tasks ({myTasks.length})</h2>
        </div>
        {myTasks.length > 0 ? (
          <div className="space-y-2">
            {myTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <Checkbox
                  checked={task.status === 'Done'}
                  onCheckedChange={() => completeTask(task.id)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-foreground">{task.title}</span>
                  {task.estimated_minutes && (
                    <span className="text-muted-foreground text-xs ml-2">{task.estimated_minutes}m</span>
                  )}
                </div>
                {task.priority === 'Critical' && (
                  <span className="text-xs text-destructive font-medium">Critical</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <span className="text-2xl">✓</span>
            <p className="text-muted-foreground mt-2">No tasks right now</p>
          </div>
        )}
      </section>

      {/* Section 3: My Stats (FOH only) */}
      {isFoh && myStats && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📊</span>
            <h2 className="font-semibold text-foreground">My Stats This Week</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              label="Revenue"
              value={fmt(myStats.sales)}
              subtext={`${myStats.salesChange >= 0 ? '↑' : '↓'}${Math.abs(myStats.salesChange)}%`}
              subtextColor={myStats.salesChange >= 0 ? 'green' : 'red'}
            />
            <StatCard label="Tips" value={fmt(myStats.tips)} subtext={myStats.tipsStatus} />
            <StatCard
              label="Tip %"
              value={fmtPct(myStats.tipPercent)}
              subtext={myStats.tipPercent > myStats.avgTipPercent ? 'Above avg' : 'Below avg'}
              subtextColor={myStats.tipPercent > myStats.avgTipPercent ? 'green' : 'yellow'}
            />
            <StatCard label="Hours" value={myStats.hours.toString()} subtext={myStats.hoursStatus} />
          </div>
        </section>
      )}

      {/* Section 4: Recognition */}
      {recognition && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⭐</span>
            <h2 className="font-semibold text-foreground">Nice Work!</h2>
          </div>
          <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-800/50 rounded-lg p-4">
            <p className="text-muted-foreground">{recognition.text}</p>
          </div>
        </section>
      )}

      {/* Section 5: My Schedule */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h2 className="font-semibold text-foreground">My Schedule This Week</h2>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {mySchedule.map((day, i) => (
            <ScheduleRow key={i} {...day} />
          ))}
        </div>
      </section>

      {/* Section 6: Quick Log */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⚡</span>
          <h2 className="font-semibold text-foreground">Something Happen?</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <QuickLogButton icon="🚨" label="Incident" intent="incident" />
          <QuickLogButton icon="🔧" label="Maintenance" intent="maintenance" />
          <QuickLogButton icon="📝" label="Note" intent="shift_notes" />
          <QuickLogButton icon="🎤" label="Voice" intent="voice_note" />
        </div>
      </section>
    </div>
  );
}
