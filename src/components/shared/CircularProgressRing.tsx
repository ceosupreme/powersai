import { cn } from '@/lib/utils';

interface CircularProgressRingProps {
  score: number;
  maxScore: number;
  label: string;
  size?: number;
  className?: string;
}

export const CircularProgressRing = ({
  score,
  maxScore,
  label,
  size = 72,
  className,
}: CircularProgressRingProps) => {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const strokeWidth = size >= 80 ? 6 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return 'stroke-signal-green';
    if (percentage >= 60) return 'stroke-gold';
    return 'stroke-destructive';
  };

  const getTextColor = () => {
    if (percentage >= 80) return 'text-signal-green';
    if (percentage >= 60) return 'text-gold';
    return 'text-destructive';
  };

  // Adjust font size based on ring size
  const getFontSize = () => {
    if (size >= 100) return 'text-2xl';
    if (size >= 80) return 'text-xl';
    return 'text-lg';
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            className="stroke-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            className={cn('transition-all duration-500', getColor())}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>
        {/* Score in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-mono font-bold', getFontSize(), getTextColor())}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground font-medium">{label}</span>}
    </div>
  );
};
