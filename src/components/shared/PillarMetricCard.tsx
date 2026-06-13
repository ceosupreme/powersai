import { cn } from '@/lib/utils';

interface PillarMetricCardProps {
  children: React.ReactNode;
  className?: string;
}

export const PillarMetricCard = ({ children, className }: PillarMetricCardProps) => {
  return (
    <div className={cn(
      'bg-[#1e293b] border border-[#334155] rounded-xl p-5',
      className
    )}>
      <div className="flex justify-between items-center pb-2 mb-1 border-b border-[#334155]">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Metric</span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Score</span>
      </div>
      {children}
    </div>
  );
};
