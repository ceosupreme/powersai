import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface StaffRequiredStripProps {
  overdueCount: number;
  logsDueCount: number;
  unreadChat: number;
}

export const StaffRequiredStrip = ({ overdueCount, logsDueCount, unreadChat }: StaffRequiredStripProps) => {
  const navigate = useNavigate();
  const hasAny = overdueCount > 0 || logsDueCount > 0 || unreadChat > 0;

  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {overdueCount > 0 && (
        <button onClick={() => navigate('/staff/tasks')}>
          <Badge variant="destructive" className="text-xs cursor-pointer hover:opacity-80">
            Overdue: {overdueCount}
          </Badge>
        </button>
      )}
      {logsDueCount > 0 && (
        <button onClick={() => navigate('/staff/logs')}>
          <Badge className="text-xs cursor-pointer hover:opacity-80 bg-gold/20 text-gold border-gold/30">
            Logs due: {logsDueCount}
          </Badge>
        </button>
      )}
      {unreadChat > 0 && (
        <button onClick={() => navigate('/staff/chat')}>
          <Badge variant="secondary" className="text-xs cursor-pointer hover:opacity-80">
            Unread: {unreadChat}
          </Badge>
        </button>
      )}
    </div>
  );
};
