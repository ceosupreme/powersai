import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState = ({ message = 'Loading...', className }: LoadingStateProps) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 animate-fade-in-up',
      className
    )}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
      </div>
      <p className="text-muted-foreground mt-4 text-sm">{message}</p>
    </div>
  );
};
