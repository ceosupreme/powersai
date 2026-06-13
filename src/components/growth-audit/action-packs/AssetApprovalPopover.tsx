// Asset approval popover — visually mirrors the insight-v2 ActionItemCard
// Approve/Reject pattern (assignee, due date, notes, emerald/red treatment).

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Check, X } from 'lucide-react';
import { MOCK_ASSIGNEES } from './types';

type Props = {
  trigger?: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  onApprove: (payload: { assigneeId?: string; dueDate?: string; notes?: string }) => void;
  onReject?: () => void;
  showReject?: boolean;
  label?: string;
};

export const AssetApprovalPopover = ({
  trigger,
  disabled,
  disabledReason,
  onApprove,
  onReject,
  showReject = true,
  label = 'Send to Marketing Hub',
}: Props) => {
  const [open, setOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleApprove = () => {
    onApprove({ assigneeId: assigneeId || undefined, dueDate: dueDate || undefined, notes: notes.trim() || undefined });
    setOpen(false);
    setAssigneeId(''); setDueDate(''); setNotes('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button size="sm" disabled={disabled} className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white" title={disabled ? disabledReason : undefined}>
            <Send className="w-3.5 h-3.5" /> {label}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-3">
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Assignee</div>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                {MOCK_ASSIGNEES.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Due date</div>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Notes</div>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context for the assignee" className="text-xs" />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end pt-1 border-t border-border/50">
          {showReject && onReject && (
            <Button size="sm" variant="outline" className="h-8 border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => { onReject(); setOpen(false); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          )}
          <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handleApprove}>
            <Check className="w-3.5 h-3.5 mr-1" /> Approve
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
