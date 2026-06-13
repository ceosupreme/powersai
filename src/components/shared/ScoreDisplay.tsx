import { getGradeFromScore, getGradeColor } from '@/utils/scoring';

const sizeClasses = {
  sm: 'text-lg font-bold',
  md: 'text-2xl font-bold',
  lg: 'text-4xl font-bold',
};

const gradeSizeClasses = {
  sm: 'text-sm px-2 py-0.5',
  md: 'text-lg px-3 py-1',
  lg: 'text-2xl px-4 py-2',
};

interface ScoreDisplayProps {
  score: number;
  showDelta?: boolean;
  delta?: number;
  size?: 'sm' | 'md' | 'lg';
  showGradeBadge?: boolean;
}

export function ScoreDisplay({ score, showDelta, delta, size = 'md', showGradeBadge = true }: ScoreDisplayProps) {
  const grade = getGradeFromScore(score);
  const color = getGradeColor(grade);

  return (
    <div className="flex items-center gap-2">
      <span style={{ color }} className={`font-mono ${sizeClasses[size]}`}>
        {Math.round(score)}
      </span>
      {showGradeBadge && (
        <span
          className={`rounded-lg font-bold text-white ${gradeSizeClasses[size]}`}
          style={{ backgroundColor: color }}
        >
          {grade}
        </span>
      )}
      {showDelta && delta !== undefined && delta !== 0 && (
        <span className={delta > 0 ? 'text-emerald-400' : 'text-red-400'}>
          {delta > 0 ? '↑' : '↓'}{Math.abs(Math.round(delta))}
        </span>
      )}
    </div>
  );
}
