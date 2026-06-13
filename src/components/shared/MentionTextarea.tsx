import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Textarea, TextareaProps } from '@/components/ui/textarea';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { getMentionQuery, insertMention } from '@/lib/mentionUtils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MentionTextareaProps extends Omit<TextareaProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect?: (member: TeamMember) => void;
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ value, onChange, onMentionSelect, onKeyDown: externalOnKeyDown, className, ...props }, ref) => {
    const { data: teamMembers = [] } = useTeamMembers();
    const [isOpen, setIsOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState<{ query: string; startIndex: number } | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    // Always use internal ref - forward it via useImperativeHandle if external ref is provided
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Forward ref to parent if provided
    useImperativeHandle(ref, () => textareaRef.current!, []);
    
    // Refs to prevent race conditions during click selection
    const mentionQueryRef = useRef<{ query: string; startIndex: number } | null>(null);
    const isSelectingRef = useRef(false);
    const cursorPositionRef = useRef<number>(0);

    // Keep ref in sync with state
    useEffect(() => {
      mentionQueryRef.current = mentionQuery;
    }, [mentionQuery]);

    // Filter team members based on query
    const filteredMembers = mentionQuery
      ? teamMembers.filter((member) =>
          member.full_name?.toLowerCase().includes(mentionQuery.query.toLowerCase())
        )
      : teamMembers;

    // Reset selected index when filtered list changes
    useEffect(() => {
      setSelectedIndex(0);
    }, [filteredMembers.length]);

    const handleSelect = useCallback(
      (member: TeamMember) => {
        // Use ref to get current mentionQuery value to avoid stale state
        const currentMentionQuery = mentionQueryRef.current;
        if (!currentMentionQuery || !textareaRef.current) return;

        // Use stored cursor position instead of reading from textarea (may be stale after blur)
        const cursorPosition = cursorPositionRef.current;
        const { newText, newCursorPosition } = insertMention(
          value,
          cursorPosition,
          currentMentionQuery.startIndex,
          member.full_name || 'Unknown'
        );

        onChange(newText);
        setIsOpen(false);
        setMentionQuery(null);
        mentionQueryRef.current = null;
        isSelectingRef.current = false;
        onMentionSelect?.(member);

        // Restore focus and cursor position
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
        });
      },
      [value, onChange, onMentionSelect]
    );

    const handlePointerDownSelect = (e: React.PointerEvent, member: TeamMember) => {
      e.preventDefault();
      e.stopPropagation();
      isSelectingRef.current = true;
      handleSelect(member);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart;
      
      // Store cursor position for use in handleSelect (prevents stale reads after blur)
      cursorPositionRef.current = cursorPosition;
      
      onChange(newValue);

      // Check for mention query
      const query = getMentionQuery(newValue, cursorPosition);
      setMentionQuery(query);
      setIsOpen(!!query);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen || filteredMembers.length === 0) {
        // Pass through Cmd+Enter
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          return;
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (filteredMembers[selectedIndex]) {
            handleSelect(filteredMembers[selectedIndex]);
          }
          break;
      case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setMentionQuery(null);
          break;
      }
    };

    const combinedKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Call internal handler first for mention selection logic
      handleKeyDown(e);
      
      // If not handled by mention logic, call external handler
      if (!e.defaultPrevented) {
        externalOnKeyDown?.(e);
      }
    };

    const handleBlur = () => {
      // Delay closing to allow click on popover items
      // But skip if we're actively selecting
      setTimeout(() => {
        if (!isSelectingRef.current) {
          setIsOpen(false);
          setMentionQuery(null);
          mentionQueryRef.current = null;
        }
      }, 150);
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

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={combinedKeyDown}
            onBlur={handleBlur}
            className={cn(className)}
            {...props}
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-64 p-0 z-50 bg-popover border border-border shadow-lg"
          align="start"
          side="top"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command className="bg-transparent" shouldFilter={false}>
            <CommandList>
              <CommandEmpty className="py-2 px-3 text-sm text-muted-foreground">
                No team members found
              </CommandEmpty>
              <CommandGroup>
                {filteredMembers.slice(0, 8).map((member, index) => (
                  <div
                    key={member.id}
                    onPointerDown={(e) => handlePointerDownSelect(e, member)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 cursor-pointer rounded-sm text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                      index === selectedIndex && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.full_name || 'Unknown'}
                      </p>
                      {member.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      )}
                    </div>
                    {member.isAsanaOnly && (
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                        Asana
                      </span>
                    )}
                  </div>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

MentionTextarea.displayName = 'MentionTextarea';
