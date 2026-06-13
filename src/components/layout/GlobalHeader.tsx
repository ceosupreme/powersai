import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, CalendarDays, Search, Plus } from 'lucide-react';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { todayPacific } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ownerMode } from '@/config/ownerMode';
import { NotificationPanel } from '@/components/staff/NotificationPanel';
import { GlobalSearchModal } from '@/components/shared/GlobalSearchModal';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { QuickCaptureButton } from '@/components/inbox/QuickCaptureButton';

interface GlobalHeaderProps {
  showVenueSelector?: boolean;
  showDateSelector?: boolean;
  forceHideVenueSelector?: boolean;
}

const formatWeekLabel = (week: { week_start: string; week_end: string }) => {
  try {
    const start = parseISO(week.week_start);
    const end = parseISO(week.week_end);
    return `${format(start, 'MMM d')} - ${format(end, 'd')}`;
  } catch {
    return week.week_start;
  }
};

export const GlobalHeader = ({ showVenueSelector = false, showDateSelector = true, forceHideVenueSelector = false }: GlobalHeaderProps) => {
  const { accessibleBars, weeks, selectedBar, selectedWeek, setSelectedBar, setSelectedWeek } = useApp();
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { currentRole, currentVenue, setCurrentVenue } = useRole();
  const { totalUnread } = useUnreadCounts();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-14 md:h-16 flex items-center justify-between px-4 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Back to Portfolio for owners drilling into a venue */}
          {currentRole === 'owner' && currentVenue && (
            <button
              onClick={() => {
                setCurrentVenue(null);
                navigate('/portfolio');
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mr-2"
            >
              ← Portfolio
            </button>
          )}

        {/* Venue Selector - always show for owners (unless force-hidden), otherwise based on prop */}
          {!forceHideVenueSelector && (showVenueSelector || currentRole === 'owner') && accessibleBars.length > 1 ? (
            <Select
              value={selectedBar?.id || ''}
              onValueChange={(value) => {
                const bar = accessibleBars.find((b) => b.id === value);
                if (bar) setSelectedBar(bar);
              }}
            >
              <SelectTrigger className="w-[130px] md:w-[180px] h-10 md:h-11 bg-card/50 border-border/50 text-foreground hover:bg-card hover:border-primary/30 transition-all duration-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary hidden sm:block" />
                  <SelectValue placeholder="Select Venue" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-md border-border/50 rounded-xl shadow-xl">
                {accessibleBars.map((bar) => (
                  <SelectItem key={bar.id} value={bar.id} className="cursor-pointer hover:bg-primary/10 rounded-lg my-0.5">
                    {bar.bar_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : !forceHideVenueSelector && (showVenueSelector || currentRole === 'owner') && accessibleBars.length === 1 ? (
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              {accessibleBars[0].bar_name}
            </span>
          ) : !forceHideVenueSelector && !showVenueSelector && (currentVenue || selectedBar) ? (
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              {currentVenue?.name || selectedBar?.bar_name}
            </span>
          ) : null}

          {ownerMode.showHeaderChat && (
            <div className="hidden md:block">
              <ChatPanel />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {showDateSelector && (
            <Select
              value={selectedWeek?.id || ''}
              onValueChange={(value) => {
                const week = weeks.find((w) => w.id === value);
                if (week) setSelectedWeek(week);
              }}
            >
              <SelectTrigger className="w-[120px] md:w-[160px] h-10 md:h-11 bg-card/50 border-border/50 text-foreground hover:bg-card hover:border-primary/30 transition-all duration-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary hidden sm:block" />
                  <SelectValue placeholder="Select Week" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-md border-border/50 rounded-xl shadow-xl">
                {weeks
                  .filter((w) => {
                    if (selectedBar && !w.bar?.includes(selectedBar.id)) return false;
                    return w.week_end < todayPacific();
                  })
                  .map((week) => (
                    <SelectItem key={week.id} value={week.id} className="cursor-pointer hover:bg-primary/10 rounded-lg my-0.5">
                      {formatWeekLabel(week)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          {/* New Task */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateTaskOpen(true)}
            className="h-9 md:h-10 gap-1.5 border-primary/30 hover:border-primary/60 hover:bg-primary/10"
            aria-label="Create new task"
          >
            <Plus className="h-4 w-4 text-primary" />
            <span className="hidden md:inline text-sm">New Task</span>
          </Button>

          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Search (⌘K)"
          >
            <Search className="h-5 w-5" />
          </Button>
          <QuickCaptureButton />
        </div>
      </header>

      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <CreateTaskModal open={createTaskOpen} onOpenChange={setCreateTaskOpen} />
    </>
  );
};
