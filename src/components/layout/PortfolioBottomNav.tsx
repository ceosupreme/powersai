import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, Lightbulb, Menu, Settings, LogOut, CalendarCheck, CheckSquare, ClipboardList, MessageCircle, Briefcase, Inbox as InboxIcon, Palette, Activity, HelpCircle, Rocket, Sunrise } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

const primaryItems = [
  { to: '/portfolio', icon: BarChart3, label: 'Portfolio' },
  { to: '/insights', icon: Lightbulb, label: 'Insights' },
];

// Agency-OS secondary set mirrors the sidebar groups
const baseSecondaryItems = [
  { to: '/workspace', icon: Sunrise, label: 'Today' },
  { to: '/weekly-review', icon: CalendarCheck, label: 'Weekly' },
  { to: '/crm', icon: Briefcase, label: 'CRM' },
  { to: '/crm?tab=inbound', icon: InboxIcon, label: 'Inbound' },
  { to: '/inbox', icon: InboxIcon, label: 'Capture' },
  { to: '/brand-kit', icon: Palette, label: 'Brand Vault' },
  { to: '/growth-audit', icon: Activity, label: 'Growth Audit' },
  { to: '/help', icon: HelpCircle, label: 'Help' },
  { to: '/launch', icon: Rocket, label: 'Launch' },
  { to: '/admin', icon: Settings, label: 'Settings' },
];

const adminSecondaryItems = [
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/logs', icon: ClipboardList, label: 'Logs' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
];

export const PortfolioBottomNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { isAdmin } = useAuth();
  const secondaryItems = isAdmin ? [...baseSecondaryItems, ...adminSecondaryItems] : baseSecondaryItems;
  const navItems = primaryItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-secondary/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[52px] min-h-[52px] relative',
              isActive ? 'text-primary bg-primary/15' : 'text-muted-foreground'
            )}>
              <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl min-w-[52px] min-h-[52px]',
              moreOpen ? 'text-primary bg-primary/15' : 'text-muted-foreground'
            )}>
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <SheetHeader className="pb-4"><SheetTitle className="text-left">More</SheetTitle></SheetHeader>
            <div className="grid grid-cols-3 gap-3 pb-4">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)} className="flex flex-col items-center gap-2 p-4 rounded-xl text-muted-foreground hover:text-foreground bg-muted/30">
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <div className="border-t border-border/50 pt-4">
              <button onClick={() => { setMoreOpen(false); supabase.auth.signOut(); }} className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-destructive hover:bg-destructive/10">
                <LogOut className="w-5 h-5" /><span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
