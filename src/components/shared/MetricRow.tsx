interface MetricRowProps {
  label: string;
  value: string;
  target?: number;
  showVariance?: boolean;
  showSign?: boolean;
  invertColor?: boolean;
}

export function MetricRow({ label, value, target, showVariance, showSign, invertColor }: MetricRowProps) {
  let variance: number | null = null;
  let varianceColor = 'text-muted-foreground';
  
  if (target && showVariance) {
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
    if (!isNaN(numValue)) {
      const diff = ((numValue - target) / target) * 100;
      variance = diff;
      
      if (invertColor) {
        varianceColor = diff <= 0 ? 'text-signal-green' : diff > 5 ? 'text-destructive' : 'text-gold';
      } else {
        varianceColor = diff >= 0 ? 'text-signal-green' : diff < -5 ? 'text-destructive' : 'text-gold';
      }
    }
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-foreground font-mono">{value}</span>
        {variance !== null && (
          <span className={`text-xs ${varianceColor}`}>
            {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
