import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendArrowProps {
  direction: 'up' | 'down' | 'flat';
}

export function TrendArrow({ direction }: TrendArrowProps) {
  if (direction === 'up') {
    return <TrendingUp className="w-5 h-5 text-signal-green" />;
  }
  if (direction === 'down') {
    return <TrendingDown className="w-5 h-5 text-destructive" />;
  }
  return <Minus className="w-5 h-5 text-muted-foreground" />;
}
