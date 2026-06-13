import { useNavigate } from 'react-router-dom';
import { useShiftDashboardData } from '@/hooks/useShiftDashboardData';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';

/* ── Inline Sub-Components ──────────────────────────────── */

function QuickLogButton({ icon, label, intent }: { icon: string; label: string; intent: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/logs?intent=${intent}`)}
      className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-muted/60 hover:bg-muted transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function LeadShiftDashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    handoff,
    handoffLoading,
    watchItems,
    overdueTasks,
    todayTasks,
    completeTask,
    leadLogDone,
    shiftStaff,
    staffAlerts,
  } = useShiftDashboardData();

  const allTasks = [...overdueTasks, ...todayTasks].slice(0, 5);

  return (
    <div className="space-y-6 pb-28">
      {/* ── Handoff from Previous Shift ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📨</span>
          <h2 className="text-lg font-semibold text-foreground">
            Handoff from Previous Shift
          </h2>
          {handoff && (
            <span className="text-sm text-muted-foreground">
              {handoff.leadName} • {handoff.submittedAt ? format(new Date(handoff.submittedAt), 'h:mm a') : ''}
            </span>
          )}
        </div>

        {handoffLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : handoff ? (
          <div className="bg-card border border-border rounded-lg p-4">
            <blockquote className="text-muted-foreground italic border-l-2 border-primary pl-3 mb-4">
              "{handoff.summary}"
            </blockquote>

            <div className="space-y-2 text-sm">
              {handoff.items86.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>🚫</span>
                  <span className="text-muted-foreground">86 Updates:</span>
                  <span className="text-foreground">{handoff.items86.join(', ')}</span>
                </div>
              )}
              {handoff.maintenance.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>🔧</span>
                  <span className="text-muted-foreground">Maintenance:</span>
                  <span className="text-foreground">{handoff.maintenance.join(', ')}</span>
                </div>
              )}
              {handoff.incidents.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>🚨</span>
                  <span className="text-muted-foreground">Incidents:</span>
                  <span className="text-foreground">{handoff.incidents.length} reported</span>
                </div>
              )}
              {handoff.shoutouts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>⭐</span>
                  <span className="text-muted-foreground">Shoutouts:</span>
                  <span className="text-foreground">{handoff.shoutouts.join(', ')}</span>
                </div>
              )}
            </div>

            <Button variant="link" size="sm" className="mt-3 px-0" onClick={() => navigate(`/logs/${handoff.logId}`)}>
              View Full Log
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <span className="text-2xl">📨</span>
            <p className="text-muted-foreground mt-2">No handoff from previous shift</p>
            <p className="text-muted-foreground/60 text-sm">Previous lead didn't complete their daily log</p>
          </div>
        )}
      </section>

      {/* ── Watch Today ── */}
      {watchItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h2 className="text-lg font-semibold text-foreground">Watch Today</h2>
          </div>
          <ul className="space-y-2">
            {watchItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span>
                  {item.severity === 'critical' ? '🔴' : item.severity === 'high' ? '🟡' : '🟢'}
                </span>
                <span className="text-muted-foreground">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── My Tasks ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <h2 className="text-lg font-semibold text-foreground">
              My Tasks ({todayTasks.length} due today)
            </h2>
          </div>
          <Button variant="link" size="sm" onClick={() => navigate('/staff/tasks')}>
            View All →
          </Button>
        </div>

        {overdueTasks.length > 0 && (
          <div className="text-destructive text-sm font-medium mb-2">
            ⚠️ {overdueTasks.length} Overdue
          </div>
        )}

        <div className="space-y-2">
          {allTasks.map((task) => {
            const isOverdue = overdueTasks.some((t) => t.id === task.id);
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  isOverdue
                    ? 'bg-destructive/10 border border-destructive/30'
                    : 'bg-card border border-border'
                }`}
              >
                <Checkbox
                  checked={task.status === 'Done'}
                  onCheckedChange={() => completeTask(task.id)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-foreground text-sm">{task.title}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {task.estimated_minutes && <span>⏱️ {task.estimated_minutes} min</span>}
                  </div>
                </div>
                {isOverdue && <span className="text-destructive text-xs font-medium">🔴 OVERDUE</span>}
              </div>
            );
          })}

          {allTasks.length === 0 && (
            <p className="text-muted-foreground text-sm py-4 text-center">No tasks due — nice work! 🎉</p>
          )}
        </div>
      </section>

      {/* ── Who's Working ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">👥</span>
          <h2 className="text-lg font-semibold text-foreground">Who's Working</h2>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="space-y-2 mb-3">
            <div>
              <span className="text-muted-foreground text-sm">FOH: </span>
              <span className="text-foreground text-sm">{shiftStaff.foh.join(', ') || 'None scheduled'}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">BOH: </span>
              <span className="text-foreground text-sm">{shiftStaff.boh.join(', ') || 'None scheduled'}</span>
            </div>
          </div>
          {staffAlerts.length > 0 && (
            <div className="pt-3 border-t border-border space-y-1">
              {staffAlerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">⚠️</span>
                  <span className="text-muted-foreground">{alert.staffName}:</span>
                  <span className="text-foreground">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Log Actions ── */}
      <section className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/logs/new')}
          className="p-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-left transition-colors"
        >
          <span className="text-2xl">📝</span>
          <h3 className="font-semibold mt-2">Daily Lead Log</h3>
          <p className="text-sm opacity-80">
            {leadLogDone ? '✅ Completed today' : 'Required before clock out'}
          </p>
        </button>
        <button
          onClick={() => navigate('/logs/new?intent=voice_note')}
          className="p-4 bg-muted hover:bg-muted/80 rounded-lg text-left transition-colors"
        >
          <span className="text-2xl">🎤</span>
          <h3 className="font-semibold text-foreground mt-2">Voice Note</h3>
          <p className="text-sm text-muted-foreground">Quick capture anytime</p>
        </button>
      </section>

      {/* ── Quick Log Bar (Fixed) ── */}
      <div
        className={`fixed z-40 right-0 p-3 bg-card/95 backdrop-blur-md border-t border-border ${
          isMobile ? 'left-0 bottom-16' : 'left-64 bottom-0'
        }`}
      >
        <div className="flex gap-3 justify-center">
          <QuickLogButton icon="🚨" label="Incident" intent="incident" />
          <QuickLogButton icon="🚫" label="86 Update" intent="86_update" />
          <QuickLogButton icon="🔧" label="Maintenance" intent="maintenance" />
          <QuickLogButton icon="⭐" label="Shoutout" intent="shoutout" />
        </div>
      </div>
    </div>
  );
}
