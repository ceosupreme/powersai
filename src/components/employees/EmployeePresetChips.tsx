import { Sparkles, AlertTriangle, UserPlus } from 'lucide-react';

export type Preset = 'allstars' | 'attention' | 'newhires' | null;

interface Props {
  active: Preset;
  onChange: (p: Preset) => void;
}

const chipBase =
  'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors';

const activeStyles: Record<Exclude<Preset, null>, string> = {
  allstars: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  attention: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  newhires: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
};

const idleStyle = 'bg-card text-muted-foreground border-border hover:bg-muted/40';

export const EmployeePresetChips = ({ active, onChange }: Props) => {
  const Chip = ({
    keyName,
    label,
    Icon,
  }: {
    keyName: Exclude<Preset, null>;
    label: string;
    Icon: typeof Sparkles;
  }) => {
    const isActive = active === keyName;
    return (
      <button
        type="button"
        onClick={() => onChange(isActive ? null : keyName)}
        className={`${chipBase} ${isActive ? activeStyles[keyName] : idleStyle}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Chip keyName="allstars" label="All-stars" Icon={Sparkles} />
      <Chip keyName="attention" label="Follow up" Icon={AlertTriangle} />
      <Chip keyName="newhires" label="New hires" Icon={UserPlus} />
    </div>
  );
};
