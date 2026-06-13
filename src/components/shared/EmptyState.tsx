import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  message: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionUrl?: string;
  onAction?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export const EmptyState = ({ message, title, description, actionLabel, actionUrl, onAction, className, icon }: EmptyStateProps) => {
  return (
    <div className={cn(
      'text-center py-12 px-4 animate-fade-in-up',
      'bg-gradient-to-b from-muted/30 to-transparent rounded-xl border border-border/30',
      className
    )}>
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 rounded-full bg-muted/50">
          {icon || <Inbox className="w-6 h-6 text-muted-foreground" />}
        </div>
        {title ? (
          <>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-muted-foreground text-sm max-w-[300px]">{description}</p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm max-w-[200px]">{message}</p>
        )}
        {actionLabel && actionUrl && (
          <Button variant="secondary" size="sm" asChild className="mt-2">
            <Link to={actionUrl}>{actionLabel}</Link>
          </Button>
        )}
        {actionLabel && onAction && !actionUrl && (
          <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
