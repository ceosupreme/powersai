import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { useApp } from '@/context/AppContext';
import { FloatingAskButton } from '@/components/shared/FloatingAskButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { Building2, CalendarDays } from 'lucide-react';
import { ChatPanel } from '@/components/chat/ChatPanel';

interface MainLayoutProps {
  children: ReactNode;
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

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { accessibleBars, weeks, selectedBar, selectedWeek, setSelectedBar, setSelectedWeek } = useApp();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top Header with Selectors - Enhanced */}
          <header className="sticky top-0 z-50 h-14 md:h-16 flex items-center justify-between px-3 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2 md:gap-3">
              <SidebarTrigger className="md:hidden touch-target" />
              
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
                    <SelectValue placeholder="Select Project" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-md border-border/50 rounded-xl shadow-xl">
                  {accessibleBars.map((bar) => (
                    <SelectItem 
                      key={bar.id} 
                      value={bar.id}
                      className="cursor-pointer hover:bg-primary/10 rounded-lg my-0.5 transition-colors"
                    >
                      {bar.bar_name}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>

            <div className="hidden md:block">
              <ChatPanel />
            </div>
            </div>

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
                  .filter((w) => !selectedBar || w.bar?.includes(selectedBar.id))
                  .map((week) => (
                    <SelectItem 
                      key={week.id} 
                      value={week.id}
                      className="cursor-pointer hover:bg-primary/10 rounded-lg my-0.5 transition-colors"
                    >
                      {formatWeekLabel(week)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </header>
          
          <div className="flex-1 px-3 md:px-8 py-4 md:py-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
        
        <FloatingAskButton />
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
};
