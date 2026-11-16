import { Card, CardContent } from '@/components/ui/card';
import { CalendarClock, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDay, isOverdue, todayPacific } from '@/lib/leads';
import type { Prospect } from '@/hooks/useProspects';
import { CrmBadge, SourceBadge, StageBadge } from './LeadBadges';
import { LeadContactIcons } from './LeadContactIcons';

interface Props { leads: Prospect[]; names: Record<string, string>; onOpen: (p: Prospect) => void }

export const personName = (id: string | null, names: Record<string, string>) =>
  !id ? 'Unassigned' : names[id] ?? 'Someone else';

export const LeadList = ({ leads, names, onOpen }: Props) => {
  const today = todayPacific();
  return (
    <ul className="space-y-2">
      {leads.map((p) => {
        const overdue = isOverdue(p.next_follow_up, today);
        return (
          <li key={p.id}>
            <Card className="hover:bg-card-hover transition-colors">
              <CardContent className="p-0">
                <div
                  role="button" tabIndex={0}
                  onClick={() => onOpen(p)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(p))}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold break-words">{p.business_name}</h3>
                      <StageBadge status={p.status} />
                      <SourceBadge p={p} />
                      <CrmBadge p={p} />
                    </div>
                    {p.contact_name && <p className="text-sm">{p.contact_name}</p>}
                    {p.phone && <p className="text-base font-medium tabular-nums">{p.phone}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {p.offer && <span className="text-foreground">{p.offer}</span>}
                      {p.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.city}</span>}
                      <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{personName(p.assigned_to, names)}</span>
                      {p.next_follow_up && (
                        <span className={cn('inline-flex items-center gap-1', overdue && 'text-destructive font-medium')}>
                          <CalendarClock className="h-3.5 w-3.5" />
                          {overdue ? 'Overdue: ' : 'Follow up '}{formatDay(p.next_follow_up)}
                        </span>
                      )}
                      {p.fit_score != null && <span>Fit {p.fit_score}</span>}
                    </div>
                  </div>
                  <LeadContactIcons p={p} />
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
};
