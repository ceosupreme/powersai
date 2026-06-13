import { Clock, Calendar, User, Check, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import type { ActionItemV2, ApprovalStatus, ActionStatusV2 } from '@/types/insights-v2';

interface ActionItemCardProps {
  action: ActionItemV2;
  onApprove?: (actionId: string, assigneeId?: string) => Promise<void>;
  onReject?: (actionId: string) => Promise<void>;
  onComplete?: (actionId: string) => Promise<void>;
  isProcessing?: boolean;
}

// Status badge styling
const statusBadgeClass: Record<ApprovalStatus, string> = {
  Proposed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Rejected: 'bg-red-500/20 text-red-400 border-red-500/30 line-through',
};

// Effort level display
const effortDisplay: Record<string, string> = {
  Quick: '⚡ Quick',
  Short: '📋 Short',
  Long: '📊 Long',
  Project: '🏗️ Project',
};

export const ActionItemCard = ({
  action,
  onApprove,
  onReject,
  onComplete,
  isProcessing,
}: ActionItemCardProps) => {
  const isProposed = action.approval_status === 'Proposed';
  const isApproved = action.approval_status === 'Approved';
  const isRejected = action.approval_status === 'Rejected';
  const isDone = action.status === 'Done';

  // Format due date
  const formattedDueDate = action.due_date 
    ? format(parseISO(action.due_date), 'MMM d')
    : null;

  // Format estimated time
  const formattedTime = action.estimated_minutes 
    ? action.estimated_minutes >= 60 
      ? `${Math.floor(action.estimated_minutes / 60)}h ${action.estimated_minutes % 60}m`
      : `${action.estimated_minutes} min`
    : null;

  return (
    <div 
      className={`
        bg-muted/30 border border-border/50 rounded-lg p-3
        ${isDone ? 'opacity-60' : ''}
        ${isRejected ? 'opacity-50' : ''}
      `}
    >
      {/* Title Row */}
      <div className="flex items-start gap-2 mb-2">
        <div className={`
          w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5
          ${isDone ? 'bg-emerald-500/20 border-emerald-500/50' : 'border-border'}
        `}>
          {isDone && <Check className="w-3 h-3 text-emerald-400" />}
        </div>
        <span className={`text-sm font-medium ${isDone || isRejected ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {action.title}
        </span>
      </div>

      {/* Metadata Row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 ml-7">
        {formattedTime && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formattedTime}
          </span>
        )}
        {formattedDueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formattedDueDate}
          </span>
        )}
        {action.suggested_assignee && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {action.suggested_assignee}
          </span>
        )}
        <span className={`ml-auto px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusBadgeClass[action.approval_status]}`}>
          {action.approval_status}
        </span>
      </div>

      {/* Action Buttons */}
      {isProposed && (
        <div className="flex items-center gap-2 ml-7">
          <Button
            size="sm"
            onClick={() => onApprove?.(action.id)}
            disabled={isProcessing}
            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Check className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject?.(action.id)}
            disabled={isProcessing}
            className="h-8 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
          >
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </div>
      )}

      {isApproved && !isDone && (
        <div className="flex items-center gap-2 ml-7">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete?.(action.id)}
            disabled={isProcessing}
            className="h-8 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Mark Complete
          </Button>
        </div>
      )}
    </div>
  );
};
