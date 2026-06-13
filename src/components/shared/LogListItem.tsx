import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LogStatusBadge } from './LogStatusBadge';
import { LOG_TYPE_INFO } from '@/types/logs';
import type { LogEntry } from '@/types/logs';
import { cn } from '@/lib/utils';

interface LogListItemProps {
  log: LogEntry;
  compact?: boolean;
}

export function LogListItem({ log, compact = false }: LogListItemProps) {
  const navigate = useNavigate();
  const typeInfo = LOG_TYPE_INFO[log.log_type];

  if (compact) {
    return (
      <button
        className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors text-left"
        onClick={() => navigate(`/logs/${log.id}`)}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{typeInfo.label}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(log.created_at), 'MMM d, h:mm a')}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => navigate(`/logs/${log.id}`)}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{typeInfo.label}</span>
            <LogStatusBadge status={log.status} />
          </div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
            {log.profiles?.full_name && (
              <span> • {log.profiles.full_name}</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
