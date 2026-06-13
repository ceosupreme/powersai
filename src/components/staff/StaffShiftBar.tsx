import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getClockStatus, setClockStatus } from '@/data/staffMockData';
import { useRole } from '@/context/RoleContext';
import { format } from 'date-fns';
import type { Department } from '@/hooks/useStaffDepartment';

interface StaffShiftBarProps {
  department: Department;
  setDepartment: (dept: Department) => void;
  hasBothDepartments: boolean;
  onClockOut: () => void;
}

export const StaffShiftBar = ({ department, setDepartment, hasBothDepartments, onClockOut }: StaffShiftBarProps) => {
  const [clockedIn, setClockedIn] = useState(() => getClockStatus() === 'in');
  const { currentRole } = useRole();
  const today = new Date();
  const hour = today.getHours();
  const shift = hour < 16 ? 'AM' : 'PM';

  const handleClockToggle = () => {
    if (clockedIn) {
      onClockOut();
    } else {
      setClockedIn(true);
      setClockStatus('in');
    }
  };

  const forceClockOut = () => {
    setClockedIn(false);
    setClockStatus('out');
  };

  return (
    <div className="sticky top-14 z-40 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-2">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Date/Shift + Department toggle */}
        <div className="flex items-center gap-3">
          {/* Date and shift type */}
          <span className="text-xs sm:text-sm font-medium text-foreground">
            {format(today, 'EEE, MMM d')} · <span className="text-primary">{shift} Shift</span>
          </span>

          {hasBothDepartments && (
            <div className="flex rounded-lg bg-background border border-border overflow-hidden">
              {(['FOH', 'BOH'] as Department[]).map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartment(dept)}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold transition-colors',
                    department === dept
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}

          {/* Lead indicator */}
          {currentRole === 'lead' && (
            <Badge variant="secondary" className="text-xs bg-primary/15 text-primary border-primary/30">
              You're the Lead
            </Badge>
          )}
        </div>

        {/* Right: Clock status + button */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              clockedIn
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', clockedIn ? 'bg-emerald-400' : 'bg-muted-foreground')} />
            {clockedIn ? 'Clocked In' : 'Clocked Out'}
          </Badge>
          <Button
            size="sm"
            variant={clockedIn ? 'outline' : 'default'}
            className="text-xs h-7 px-3"
            onClick={handleClockToggle}
          >
            {clockedIn ? 'Clock Out' : 'Clock In'}
          </Button>
        </div>
      </div>
    </div>
  );
};
