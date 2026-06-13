import { ChatLayout } from '@/components/chat/ChatLayout';

const Chat = () => {
  return (
    <div className="h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)] rounded-xl border border-border/50 overflow-hidden bg-card/10">
      <ChatLayout />
    </div>
  );
};

export default Chat;
