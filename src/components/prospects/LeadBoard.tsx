import { useState } from 'react';
import { cn } from '@/lib/utils';
import { LEAD_STAGES, formatDay, isOverdue, stageOf, todayPacific, type LeadStage } from '@/lib/leads';
import type { Prospect } from '@/hooks/useProspects';
import { CrmBadge, DoNotContactBadge, SourceBadge, STAGE_TONE } from './LeadBadges';
import { LeadContactIcons } from './LeadContactIcons';
import { LeadMoveMenu } from './LeadMoveMenu';
import { personName } from './LeadList';

interface Props {
  leads: Prospect[];
  names: Record<string, string>;
  onOpen: (p: Prospect) => void;
  onMove: (p: Prospect, stage: LeadStage) => void;
}

/** One column per stage. Drag on desktop; every card also has a Move to menu for touch. */
export const LeadBoard = ({ leads, names, onOpen, onMove }: Props) => {
  const [over, setOver] = useState<LeadStage | null>(null);
  const today = todayPacific();
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex gap-3 min-w-max">
        {LEAD_STAGES.map((col) => {
          const rows = leads.filter((p) => stageOf(p.status) === col.key);
          return (
            <section
              key={col.key}
              aria-label={col.label}
              onDragOver={(e) => { e.preventDefault(); setOver(col.key); }}
              onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault(); setOver(null);
                const p = leads.find((x) => x.id === e.dataTransfer.getData('text/plain'));
                if (p && stageOf(p.status) !== col.key) onMove(p, col.key);
              }}
              className={cn('w-72 shrink-0 rounded-xl border bg-muted/30 p-2 transition-colors', over === col.key && 'ring-2 ring-primary bg-primary/5')}
            >
              <header className="flex items-center justify-between px-1 pb-2">
                <span className={cn('rounded-md border px-2 py-0.5 text-sm font-semibold', STAGE_TONE[col.key])}>{col.label}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{rows.length}</span>
              </header>
              <div className="space-y-2 min-h-24">
                {rows.map((p) => (
                  <article
                    key={p.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onClick={() => onOpen(p)}
                    className="cursor-pointer rounded-lg border bg-card p-3 space-y-2 shadow-sm hover:bg-card-hover md:cursor-grab"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-[15px] font-semibold break-words">{p.business_name}</h3>
                      <CrmBadge p={p} />
                      <DoNotContactBadge p={p} />
                    </div>
                    {p.phone && <p className={cn('text-sm font-medium tabular-nums', p.do_not_contact && 'text-muted-foreground line-through')}>{p.phone}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      <SourceBadge p={p} />
                      {p.offer && <span className="text-foreground">{p.offer}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {personName(p.assigned_to, names)}
                      {p.next_follow_up && (
                        <span className={cn(isOverdue(p.next_follow_up, today) && 'text-destructive font-medium')}> · {formatDay(p.next_follow_up)}</span>
                      )}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <LeadContactIcons p={p} />
                      <LeadMoveMenu status={p.status} onMove={(s) => onMove(p, s)} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
