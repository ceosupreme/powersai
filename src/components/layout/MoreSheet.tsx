import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MORE_SECTIONS, type MoreNavSection } from './moreNavSections';

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trigger: React.ReactNode;
  /** Optionally hide a set of routes already shown in the primary bar. */
  excludeRoutes?: string[];
}

export const MoreSheet = ({ open, onOpenChange, trigger, excludeRoutes = [] }: MoreSheetProps) => {
  const location = useLocation();
  const { canAccessPage, isAdmin } = useAuth();

  const filteredSections = useMemo<MoreNavSection[]>(() => {
    const excluded = new Set(excludeRoutes);
    return MORE_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (i) =>
          !excluded.has(i.to) &&
          (!i.adminOnly || isAdmin) &&
          canAccessPage(i.pageKey),
      ),
    })).filter((s) => s.items.length > 0);
  }, [canAccessPage, isAdmin, excludeRoutes]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-safe max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="text-left">More</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-4">
          {filteredSections.map((section) => (
            <div key={section.label} className="space-y-2">
              <div className="px-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 min-h-[76px] p-2.5 rounded-xl transition-all duration-200 touch-manipulation active:scale-95 text-center',
                        isActive
                          ? 'text-primary bg-primary/15'
                          : 'text-muted-foreground hover:text-foreground active:bg-muted/50 bg-muted/30',
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-[11px] font-medium leading-tight break-words">
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/50 pt-3">
          <button
            onClick={() => {
              onOpenChange(false);
              handleSignOut();
            }}
            className="flex items-center justify-center gap-2 w-full p-3 rounded-xl text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-200 touch-manipulation"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};