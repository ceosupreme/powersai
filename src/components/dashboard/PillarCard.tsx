import { Link } from 'react-router-dom';
import { DollarSign, Users, Settings, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CircularProgressRing } from '@/components/shared/CircularProgressRing';

interface PillarCardProps {
  pillar: 'Revenue' | 'Labor' | 'Operations' | 'Guest Experience';
  score: number;
  maxScore: number;
  drivers: string;
  path: string;
}

const pillarConfig = {
  Revenue: { icon: DollarSign, color: 'text-primary', label: 'Sales' },
  Labor: { icon: Users, color: 'text-blue', label: 'Labor' },
  Operations: { icon: Settings, color: 'text-gold', label: 'Operations' },
  'Guest Experience': { icon: Heart, color: 'text-signal-green', label: 'Guest Exp' },
};

// Helper function to parse drivers into bullet points
const parseDrivers = (drivers: string): string[] => {
  if (!drivers) return [];
  
  return drivers
    .split(/[\n;]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .slice(0, 2);
};

export const PillarCard = ({ pillar, score, maxScore, drivers, path }: PillarCardProps) => {
  const config = pillarConfig[pillar];
  const driversList = parseDrivers(drivers);

  return (
    <Link
      to={path}
      className={cn(
        'p-3 md:p-5 flex flex-col items-center group rounded-xl border border-transparent',
        'hover:border-primary/30 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5',
        'active:scale-[0.98] transition-all duration-200 min-h-[120px] touch-manipulation',
        'relative overflow-hidden'
      )}
    >
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      </div>

      {/* Circular Progress Ring */}
      <div className="relative z-10 group-hover:scale-105 transition-transform duration-200">
        <CircularProgressRing 
          score={score} 
          maxScore={maxScore}
          label=""
          size={64}
          className="md:w-20 md:h-20"
        />
      </div>
      
      {/* Pillar Name */}
      <span className="text-sm text-muted-foreground mt-2 mb-4 font-medium relative z-10 group-hover:text-foreground transition-colors">
        {config.label}
      </span>

      {/* Driver Items */}
      <div className="w-full space-y-2 relative z-10">
        {driversList.length > 0 ? (
          driversList.map((driver, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF] flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{driver}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground/60 text-center">No drivers recorded</div>
        )}
      </div>
    </Link>
  );
};
