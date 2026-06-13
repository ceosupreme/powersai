import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChannelList } from './ChannelList';
import { ChannelHeader } from './ChannelHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChannels } from '@/hooks/useChannels';
import { useMessages } from '@/hooks/useMessages';
import { ChatChannelWithMembers } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  className?: string;
  isPanel?: boolean;
}

export const ChatLayout = ({ className, isPanel = false }: ChatLayoutProps) => {
  const [selectedChannel, setSelectedChannel] = useState<ChatChannelWithMembers | null>(null);
  const [showChannelList, setShowChannelList] = useState(true);
  const { channels, isLoading: channelsLoading, ensureGeneralChannel } = useChannels();
  const { 
    messages, 
    isLoading: messagesLoading, 
    sendMessage, 
    isSending,
    markAsRead 
  } = useMessages(selectedChannel?.id || null);

  useEffect(() => {
    const initializeChat = async () => {
      if (channels.length > 0 && !selectedChannel) {
        setSelectedChannel(channels[0]);
      } else if (channels.length === 0 && !channelsLoading) {
        try { await ensureGeneralChannel(); } catch (error) { console.error('Failed to create General channel:', error); }
      }
    };
    initializeChat();
  }, [channels, selectedChannel, channelsLoading]);

  useEffect(() => {
    if (selectedChannel) markAsRead();
  }, [selectedChannel?.id]);

  const handleSelectChannel = (channel: ChatChannelWithMembers) => {
    setSelectedChannel(channel);
    // On mobile or panel, hide channel list when selecting
    if (isPanel || window.innerWidth < 768) {
      setShowChannelList(false);
    }
  };

  const handleBack = () => {
    setShowChannelList(true);
  };

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Channel List Sidebar */}
      <div 
        className={cn(
          "border-r border-border/50 bg-card/20",
          isPanel 
            ? (showChannelList ? "w-full" : "hidden") 
            : cn(
                "w-full md:w-72 lg:w-80 shrink-0",
                !showChannelList ? "hidden md:block" : "block"
              )
        )}
      >
        <ChannelList
          channels={channels}
          selectedChannel={selectedChannel}
          onSelectChannel={handleSelectChannel}
          isLoading={channelsLoading}
        />
      </div>

      {/* Message Area */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0",
          isPanel && showChannelList && "hidden",
          !isPanel && showChannelList && "hidden md:flex"
        )}
      >
        {selectedChannel ? (
          <>
            <ChannelHeader 
              channel={selectedChannel} 
              onBack={isPanel || window.innerWidth < 768 ? handleBack : undefined}
            />
            <MessageList 
              messages={messages} 
              isLoading={messagesLoading} 
            />
            <MessageInput 
              onSend={sendMessage} 
              isSending={isSending} 
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground/80">Welcome to Chat</p>
                <p className="text-sm text-muted-foreground/60">Select a channel to start messaging</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
