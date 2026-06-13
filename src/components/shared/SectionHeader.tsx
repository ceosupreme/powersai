import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  count?: number;
  className?: string;
  showInsightIcon?: boolean;
}

export const SectionHeader = ({ title, count, className, showInsightIcon }: SectionHeaderProps) => {
  return (
    <div className={cn('section-header my-6 animate-fade-in-up', className)}>
      <span className="flex-shrink-0 px-3 py-1 flex items-center gap-2 bg-card/50 rounded-full backdrop-blur-sm">
        {showInsightIcon && (
          <Lightbulb className="w-4 h-4 text-[#2DD4BF] animate-pulse" />
        )}
        <span className="text-foreground/90">{title}</span>
        {typeof count === 'number' && (
          <span className="ml-1 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs font-bold">
            {count}
          </span>
        )}
      </span>
    </div>
  );
};
