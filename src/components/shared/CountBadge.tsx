import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'subtle';
  className?: string;
}

export const CountBadge = ({ count, max = 99, variant = 'default', className }: CountBadgeProps) => {
  if (count <= 0) return null;

  const display = count > max ? `${max}+` : count;

  return (
    <Badge
      variant={variant === 'default' ? 'destructive' : 'secondary'}
      className={cn(
        'h-5 min-w-[20px] px-1.5 text-[10px] font-bold',
        variant === 'subtle' && 'bg-primary text-primary-foreground',
        className,
      )}
    >
      {display}
    </Badge>
  );
};
