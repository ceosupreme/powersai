import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CountBadge } from '@/components/shared/CountBadge';
import { LucideIcon } from 'lucide-react';

interface SidebarLinkProps {
  href: string;
  icon?: LucideIcon;
  children: ReactNode;
  badge?: number;
  badgeVariant?: 'default' | 'urgent';
}

export const SidebarLink = ({ href, icon: Icon, children, badge, badgeVariant = 'default' }: SidebarLinkProps) => {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
          )}
          {Icon && (
            <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
          )}
          <span className="flex-1 text-sm">{children}</span>
          {badge !== undefined && badge > 0 && (
            <CountBadge
              count={badge}
              className={cn(
                badgeVariant === 'urgent' && 'bg-destructive text-destructive-foreground'
              )}
            />
          )}
        </>
      )}
    </NavLink>
  );
};
