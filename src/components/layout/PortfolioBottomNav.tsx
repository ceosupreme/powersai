import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, Lightbulb, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MoreSheet } from './MoreSheet';

const primaryItems = [
  { to: '/portfolio', icon: BarChart3, label: 'Portfolio' },
  { to: '/insights', icon: Lightbulb, label: 'Insights' },
];
const PRIMARY_ROUTES = primaryItems.map((i) => i.to);

export const PortfolioBottomNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-secondary/95 backdrop-blur-lg border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {primaryItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[52px] min-h-[52px] relative',
                isActive ? 'text-primary bg-primary/15' : 'text-muted-foreground',
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}

        <MoreSheet
          open={moreOpen}
          onOpenChange={setMoreOpen}
          excludeRoutes={PRIMARY_ROUTES}
          trigger={
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl min-w-[52px] min-h-[52px]',
                moreOpen ? 'text-primary bg-primary/15' : 'text-muted-foreground',
              )}
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          }
        />
      </div>
    </nav>
  );
};
