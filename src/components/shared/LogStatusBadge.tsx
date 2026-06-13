import { Badge } from '@/components/ui/badge';
import type { LogStatus } from '@/types/logs';

interface LogStatusBadgeProps {
  status: LogStatus;
}

export function LogStatusBadge({ status }: LogStatusBadgeProps) {
  return (
    <Badge
      variant={status === 'submitted' ? 'default' : 'secondary'}
      className={status === 'submitted' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 text-black hover:bg-yellow-600'}
    >
      {status === 'submitted' ? 'Submitted' : 'Draft'}
    </Badge>
  );
}
