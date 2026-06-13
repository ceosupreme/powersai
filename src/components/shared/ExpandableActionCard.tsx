import { useState } from 'react';
import { ActionCard } from '@/types/venue';
import { format, parseISO } from 'date-fns';
import { Check, X, Clock, Calendar, Loader2, ExternalLink, ChevronDown, ChevronUp, AlertTriangle, Info, UserPlus, Lightbulb, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { DeepDiveModal } from './DeepDiveModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { EmployeeNameLink } from '@/components/employees/EmployeeNameLink';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { MentionPicker } from './MentionPicker';

interface ExpandableActionCardProps {
  card: ActionCard & { weekStart?: string; simple_citation?: string; bar_id?: string; employee_id?: string; employee_name?: string; source_log_id?: string | null; source_log_asana_url?: string | null };
  onApprove?: (id: string, assigneeId?: string, barCode?: string, note?: string, dueDate?: string, asanaGid?: string, mentionGids?: string[]) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  isProcessing?: boolean;
  barCode?: string;
  venueName?: string;
  initialExpanded?: boolean;
}

// Full border colors (thin colored border around entire card)
const priorityBorderColors: Record<string, string> = {
  Critical: 'border-destructive/30',
  High: 'border-orange/30',
  Medium: 'border-gold/30',
  Low: 'border-blue/30',
};

// Hover glow effect
const priorityHoverGlowColors: Record<string, string> = {
  Critical: 'hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  High: 'hover:shadow-[0_0_12px_rgba(249,115,22,0.3)]',
  Medium: 'hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  Low: 'hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]',
};

// Pill background colors
const priorityPillColors: Record<string, string> = {
  Critical: 'bg-destructive text-destructive-foreground',
  High: 'bg-orange text-black',
  Medium: 'bg-gold text-black',
  Low: 'bg-blue text-white',
};

// Icon background colors
const priorityIconBgColors: Record<string, string> = {
  Critical: 'bg-destructive/20 text-destructive',
  High: 'bg-orange/20 text-orange',
  Medium: 'bg-gold/20 text-gold',
  Low: 'bg-blue/20 text-blue',
};

// Priority labels
const priorityLabels: Record<string, string> = {
  Critical: 'CRITICAL',
  High: 'HIGH',
  Medium: 'MEDIUM',
  Low: 'LOW',
};

const getPriorityIcon = (priority: string) => {
  if (priority === 'Low') {
    return <Info className="w-4 h-4" />;
  }
  return <AlertTriangle className="w-4 h-4" />;
};

interface VenueLeader {
  id: string;
  display_name: string;
  role_type: string;
  asana_gid: string | null;
  profile_id: string | null;
}

const useVenueLeaders = (barId?: string) => {
  return useQuery({
    queryKey: ['venue-leaders', barId],
    queryFn: async (): Promise<VenueLeader[]> => {
      if (!barId) return [];
      const { data, error } = await supabase
        .from('venue_leadership_contacts')
        .select('id, display_name, role_type, asana_gid, profile_id')
        .eq('venue_id', barId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return (data || []) as VenueLeader[];
    },
    enabled: !!barId,
    staleTime: 5 * 60 * 1000,
  });
};

export const ExpandableActionCard = ({
  card,
  onApprove,
  onReject,
  isProcessing,
  barCode,
  venueName,
  initialExpanded = false,
}: ExpandableActionCardProps) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [approvalNote, setApprovalNote] = useState('');
  const [mentionGids, setMentionGids] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(
    card.due_date ? parseISO(card.due_date) : undefined
  );
  const { data: venueLeaders } = useVenueLeaders(card.bar_id);
  const { data: teamMembers } = useTeamMembers();

  // Deduplicate team members against venue leaders by name
  const venueLeaderNames = new Set((venueLeaders || []).map(l => l.display_name.toLowerCase()));
  const filteredTeamMembers = (teamMembers || []).filter(
    m => !venueLeaderNames.has((m.full_name || '').toLowerCase())
  );

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

  const hasAction = card.action_title && card.action_title.trim().length > 0;
  const isProposed = card.approval_status === 'Proposed';
  const isApproved = card.approval_status === 'Approved';
  const isRejected = card.approval_status === 'Rejected';

  const handleApprove = async () => {
    if (!onApprove || isApproving) return;
    setIsApproving(true);
    try {
      let assigneeValue: string | undefined;
      let resolvedAsanaGid: string | undefined;

      if (selectedAssignee) {
        const matchedLeader = venueLeaders?.find(l => l.id === selectedAssignee);
        if (matchedLeader) {
          assigneeValue = selectedAssignee;
          resolvedAsanaGid = matchedLeader.asana_gid || undefined;
        } else {
          // Global team member — check if Asana-only
          const selectedMember = teamMembers?.find(m => m.id === selectedAssignee);
          resolvedAsanaGid = selectedMember?.asanaGid || undefined;
          assigneeValue = selectedMember?.isAsanaOnly
            ? selectedMember.asanaGid
            : selectedAssignee;
        }
      }

      const dueDateStr = selectedDueDate ? format(selectedDueDate, 'yyyy-MM-dd') : undefined;
      await onApprove(card.id, assigneeValue || undefined, barCode, approvalNote || undefined, dueDateStr, resolvedAsanaGid, mentionGids.length ? mentionGids : undefined);
    } finally {
      setIsApproving(false);
    }
  };

  // Check if this is a native task URL (starts with /tasks)
  const isNativeTask = card.asana_task_url?.startsWith('/tasks');

  return (
    <div className={cn(
      'bg-card rounded-xl overflow-hidden transition-all duration-300',
      'border',
      priorityBorderColors[card.priority],
      priorityHoverGlowColors[card.priority],
      isRejected && 'opacity-60'
    )}>
      {/* Header - Always visible */}
      <div 
        className="p-3 md:p-4 cursor-pointer hover:bg-card-hover transition-colors min-h-[56px] touch-manipulation active:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            {/* Priority Icon */}
            <div className={cn('p-1 md:p-1.5 rounded-full flex-shrink-0', priorityIconBgColors[card.priority])}>
              {getPriorityIcon(card.priority)}
            </div>
            {/* Priority Pill */}
            <span className={cn(
              'px-2 md:px-2.5 py-0.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wide',
              priorityPillColors[card.priority]
            )}>
            {priorityLabels[card.priority]}
            </span>
            {/* Source Date */}
            {card.weekStart && (
              <span className="text-muted-foreground text-[10px] md:text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(card.weekStart)}
              </span>
            )}
            {/* Venue Badge */}
            {venueName && (
              <span className="px-2 py-0.5 rounded-md text-[10px] md:text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                {venueName}
              </span>
            )}
            {/* Pillar */}
            <span className="text-muted-foreground text-xs md:text-sm hidden sm:inline">{card.pillar}</span>
            {/* Employee Chip */}
            {card.employee_id && card.employee_name && (
              <EmployeeNameLink employeeId={card.employee_id} name={card.employee_name} />
            )}
          </div>
          {/* More/Less Button with Glow */}
          <div className={cn(
            'flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium transition-all duration-200 flex-shrink-0',
            expanded 
              ? 'bg-primary/20 text-primary ring-1 ring-primary/30' 
              : 'bg-primary/15 text-primary hover:bg-primary/25 ring-1 ring-primary/40 shadow-[0_0_10px_rgba(212,165,116,0.2)]'
          )}>
            <span>{expanded ? 'Less' : 'More'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          </div>
        </div>
        
        <h3 className="text-foreground font-medium text-sm md:text-base">{card.insight_title}</h3>
        
        {!expanded && (
          <p className="text-muted-foreground text-xs md:text-sm mt-1 line-clamp-2 md:line-clamp-1">
            {card.insight_summary}
          </p>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* What Happened Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-gold text-xs font-medium uppercase tracking-wide">
                What Happened
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeepDive(true);
                }}
                className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title="More details"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
            </div>
            <p className="text-foreground/80 text-sm mt-1 whitespace-pre-line">
              {card.problem_detail}
            </p>
          </div>

          {/* Source Citation */}
          {card.simple_citation && (
            <div className="mt-3 px-3 py-2 bg-muted/40 rounded-md border border-border/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Source</span>
                {card.source_log_id && card.source_log_asana_url && (
                  <a
                    href={card.source_log_asana_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-primary hover:underline"
                  >
                    Source log
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="text-muted-foreground text-xs mt-0.5">{card.simple_citation}</p>
            </div>
          )}

          {/* Action Section */}
          <div className="mt-4">
            <span className="text-signal-green text-xs font-medium uppercase tracking-wide">
              Action
            </span>
            <p className="text-foreground font-medium mt-1">
              {card.action_title}
            </p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {card.estimated_minutes} min
            </span>
            {card.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {formatDate(card.due_date)}
              </span>
            )}
          </div>

          <DeepDiveModal
            open={showDeepDive}
            onOpenChange={setShowDeepDive}
            card={card}
            barId={barCode}
          />

          {/* Actions for Proposed status */}
          {isProposed && onApprove && onReject && (
            <div className="mt-4 space-y-3">
              {/* Assignee Select */}
              <Select 
                value={selectedAssignee} 
                onValueChange={setSelectedAssignee}
                disabled={isProcessing || isApproving}
              >
                <SelectTrigger className="w-full bg-muted/50 border-border/60 hover:bg-muted hover:border-border transition-all duration-200">
                  <div className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Assign to... (required)" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {venueLeaders && venueLeaders.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Venue Leadership</div>
                      {venueLeaders.map((leader) => (
                        <SelectItem key={leader.id} value={leader.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(leader.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{leader.display_name}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {leader.role_type === 'gm' ? 'GM' : 'Lead'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Team</div>
                  {filteredTeamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.full_name || member.email}</span>
                        {member.isAsanaOnly && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Asana
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Due Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isProcessing || isApproving}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-muted/50 border-border/60 hover:bg-muted hover:border-border",
                      !selectedDueDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {selectedDueDate ? format(selectedDueDate, 'PPP') : 'Set due date (required)'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDueDate}
                    onSelect={setSelectedDueDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Textarea
                placeholder="Add a note (optional)"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                disabled={isProcessing || isApproving}
                className="min-h-[60px] text-sm bg-muted/50 border-border/60"
              />

              <MentionPicker
                venueId={card.bar_id}
                value={mentionGids}
                onChange={setMentionGids}
                disabled={isProcessing || isApproving}
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove();
                  }}
                  disabled={isProcessing || isApproving || !selectedAssignee || !selectedDueDate}
                  className="flex-1 min-h-[44px] bg-gradient-to-r from-signal-green to-emerald-500 hover:from-signal-green hover:to-emerald-400 text-white border-0 shadow-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-200 touch-manipulation"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      Creating...
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
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(card.id);
                  }}
                  disabled={isProcessing || isApproving}
                  className="flex-1 min-h-[44px] border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60 transition-all duration-200 touch-manipulation"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* Approved State */}
          {isApproved && (
            <div className="flex items-center justify-between mt-4 p-3 bg-signal-green/10 border border-signal-green/20 rounded-md">
              <span className="text-signal-green text-sm flex items-center gap-1">
                <Check className="w-4 h-4" />
                Approved
              </span>
              {card.asana_task_url && (
                isNativeTask ? (
                  <Link
                    to={card.asana_task_url}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 transition-colors"
                  >
                    View Task
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <a
                    href={card.asana_task_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 transition-colors"
                  >
                    Open in Asana
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )
              )}
            </div>
          )}

          {/* Rejected State */}
          {isRejected && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <span className="text-destructive text-sm flex items-center gap-1">
                <X className="w-4 h-4" />
                Rejected
              </span>
            </div>
          )}

          {/* Add related task — always available on expanded card */}
          <div className="mt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreateTask(true)}
              className="text-xs text-muted-foreground hover:text-primary gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add related task
            </Button>
          </div>

          <CreateTaskModal
            open={showCreateTask}
            onOpenChange={setShowCreateTask}
            prefill={{
              sourceInsightId: (card as any).insightId || (card as any).insight_id || card.id,
              sourceTitle: card.insight_title,
              venueId: card.bar_id,
              pillar: card.pillar,
            }}
          />
        </div>
      )}
    </div>
  );
};
