import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Users, FileText } from 'lucide-react';
import type { LogPosition } from '@/types/logs';
import { POSITION_INFO } from '@/types/logs';

interface PositionSelectorProps {
  positions: LogPosition[];
  onSelect: (position: LogPosition) => void;
}

const POSITION_ICONS: Record<LogPosition, React.ReactNode> = {
  general_manager: <ClipboardList className="h-8 w-8" />,
  shift_lead: <Users className="h-8 w-8" />,
  staff: <FileText className="h-8 w-8" />,
};

export function PositionSelector({ positions, onSelect }: PositionSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground text-center">
        Select your role for today's log
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {positions.map((position) => {
          const info = POSITION_INFO[position];
          return (
            <Card
              key={position}
              className="cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
              onClick={() => onSelect(position)}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 text-primary">{POSITION_ICONS[position]}</div>
                <h3 className="font-semibold text-foreground">{info.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{info.logLabel}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
