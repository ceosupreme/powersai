import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MentionTextarea } from '@/components/shared/MentionTextarea';
import { extractMentions } from '@/lib/mentionUtils';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface MessageInputProps {
  onSend: (params: { content: string; mentions: { user_id: string; display_name: string }[] }) => Promise<any>;
  isSending: boolean;
}

export const MessageInput = ({ onSend, isSending }: MessageInputProps) => {
  const [content, setContent] = useState('');
  const { data: teamMembers = [] } = useTeamMembers();

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending) return;

    const mentions = extractMentions(trimmedContent, teamMembers);
    
    try {
      await onSend({ content: trimmedContent, mentions });
      setContent('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 md:p-4 border-t border-border/60 bg-card/30 backdrop-blur-sm">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <MentionTextarea
            value={content}
            onChange={setContent}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (⌘+Enter to send)"
            className="min-h-[44px] max-h-[160px] resize-none rounded-xl bg-muted/40 border-transparent focus:border-primary/30 text-sm"
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          size="icon"
          className="shrink-0 h-10 w-10 rounded-xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
