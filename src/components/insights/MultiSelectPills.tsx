import { cn } from '@/lib/utils';

interface PillOption {
  value: string;
  label: string;
  color: 'red' | 'orange' | 'yellow' | 'green';
}

interface MultiSelectPillsProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: PillOption[];
}

const colorClasses: Record<string, { active: string; inactive: string }> = {
  red: {
    active: 'bg-destructive text-destructive-foreground border-destructive',
    inactive: 'bg-transparent text-destructive border-destructive/50 hover:bg-destructive/10',
  },
  orange: {
    active: 'bg-orange text-white border-orange',
    inactive: 'bg-transparent text-orange border-orange/50 hover:bg-orange/10',
  },
  yellow: {
    active: 'bg-gold text-black border-gold',
    inactive: 'bg-transparent text-gold border-gold/50 hover:bg-gold/10',
  },
  green: {
    active: 'bg-signal-green text-white border-signal-green',
    inactive: 'bg-transparent text-signal-green border-signal-green/50 hover:bg-signal-green/10',
  },
};

export const MultiSelectPills = ({ value, onChange, options }: MultiSelectPillsProps) => {
  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(option => {
        const isActive = value.includes(option.value);
        const classes = colorClasses[option.color];

        return (
          <button
            key={option.value}
            onClick={() => toggle(option.value)}
            className={cn(
              'px-3 py-1 text-xs sm:text-sm rounded-full border transition-colors font-medium',
              isActive ? classes.active : classes.inactive
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
