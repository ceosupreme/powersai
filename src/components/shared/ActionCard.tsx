import { useState } from 'react';
import { Action } from '@/types/venue';
import { format, parseISO } from 'date-fns';
import { Check, X, Clock, Calendar, Loader2, ExternalLink, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';

interface ActionCardProps {
  action: Action;
  onApprove?: (id: string, assigneeId?: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export const ActionCard = ({
  action,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: ActionCardProps) => {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const { data: teamMembers } = useTeamMembers();

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isProposed = action.approval_status === 'Proposed';
  const isApproved = action.approval_status === 'Approved';

  // Check if this is a native task URL (starts with /tasks)
  const isNativeTask = action.asana_task_url?.startsWith('/tasks');

  return (
    <div className={cn(
      'card-metric p-4 transition-all duration-200',
      isApproved && 'border-signal-green/30 bg-signal-green/5'
    )}>
      {/* Title */}
      <div className="flex items-start gap-2 mb-3">
        {isApproved && (
          <Check className="w-5 h-5 text-signal-green flex-shrink-0 mt-0.5" />
        )}
        <h4 className="font-medium text-foreground flex-1">{action.title}</h4>
      </div>

      {/* Details */}
      {action.details && isProposed && (
        <p className="text-sm text-muted-foreground mb-3">{action.details}</p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {action.estimated_minutes} min
        </span>
        {action.due_date_suggested && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Due: {formatDate(action.due_date_suggested)}
          </span>
        )}
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs',
          action.approval_status === 'Approved' && 'bg-signal-green/20 text-signal-green',
          action.approval_status === 'Proposed' && 'bg-muted text-muted-foreground',
          action.approval_status === 'Rejected' && 'bg-destructive/20 text-destructive',
        )}>
          {action.approval_status}
        </span>
      </div>

      {/* Task Link for approved actions */}
      {isApproved && action.asana_task_url && (
        isNativeTask ? (
          <Link
            to={action.asana_task_url}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mb-3 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Task
          </Link>
        ) : (
          <a
            href={action.asana_task_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mb-3 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Asana
          </a>
        )
      )}

      {/* Assignee Dropdown & Action Buttons */}
      {isProposed && onApprove && onReject && (
        <div className="space-y-3">
          {/* Assignee Dropdown - Using team members from profiles */}
          <Select
            value={selectedAssignee || 'unassigned'}
            onValueChange={(v) => setSelectedAssignee(v === 'unassigned' ? '' : v)}
            disabled={isApproving || isRejecting}
          >
            <SelectTrigger className="w-full bg-muted border border-border">
              <SelectValue placeholder="Assign to... (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>Unassigned</span>
                </div>
              </SelectItem>
              {teamMembers?.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.full_name || member.email}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onApprove(action.id, selectedAssignee || undefined)}
              disabled={isApproving || isRejecting}
              className="btn-approve flex-1 min-h-[44px] touch-manipulation"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Creating Task...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => onReject(action.id)}
              disabled={isApproving || isRejecting}
              className="btn-reject flex-1 min-h-[44px] touch-manipulation"
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
