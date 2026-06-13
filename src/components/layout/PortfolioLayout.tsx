import { ReactNode, useState } from 'react';
import { Activity, BarChart3, Lightbulb, CalendarCheck, Settings, Eye, X, LogOut, Bell, ChevronUp } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SidebarSection } from './SidebarSection';
import { SidebarLink } from './SidebarLink';
import { GlobalHeader } from './GlobalHeader';
import { FloatingAskButton } from '@/components/shared/FloatingAskButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { PortfolioBottomNav } from './PortfolioBottomNav';
import { useAuth } from '@/context/AuthContext';
import { usePreview } from '@/context/PreviewContext';
import { useOwnerMode } from '@/hooks/useOwnerMode';
import { ROLE_LABELS, UserRole } from '@/types/roles';
import { useTaskBadgeCount } from '@/hooks/useTaskBadgeCount';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPanel } from '@/components/staff/NotificationPanel';

// Only needed when staff tools are visible
import { CheckSquare, ClipboardList, MessageCircle, Megaphone, Smartphone, DollarSign, Users as UsersIcon, Star, LayoutDashboard } from 'lucide-react';

interface PortfolioLayoutProps {
  children: ReactNode;
}

export const PortfolioLayout = ({ children }: PortfolioLayoutProps) => {
  const { data: taskBadgeCount } = useTaskBadgeCount();
  const { totalUnread: chatUnreadCount } = useUnreadCounts();
  const isMobile = useIsMobile();
  const { isAdmin, profile, role } = useAuth();
  const flags = useOwnerMode();
  const { isPreview, previewRoleLabel, setPreviewRole } = usePreview();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isPortfolioPage = location.pathname === '/portfolio';

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col shrink-0">
          <div className="p-4 border-b border-sidebar-border">
            <Link to="/portfolio" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <span className="font-sans text-lg font-bold text-foreground tracking-tight">Bar Pulse</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* MAIN section — always visible */}
            <div className="space-y-0.5">
              <SidebarLink href="/portfolio" icon={BarChart3}>Portfolio</SidebarLink>
              <SidebarLink href="/weekly-review" icon={CalendarCheck}>Weekly Review</SidebarLink>
              <SidebarLink href="/insights" icon={Lightbulb}>Insights</SidebarLink>
              {(role === 'owner' || role === 'gm' || isAdmin) && (
                <SidebarLink href="/employees" icon={UsersIcon}>Employees</SidebarLink>
              )}
            </div>

            {/* Legacy nav items — hidden in owner mode, preserved for re-enabling */}
            {flags.showStaffTools && (
              <SidebarSection title="Tools">
                <SidebarLink href="/tasks" icon={CheckSquare} badge={taskBadgeCount} badgeVariant="urgent">Tasks</SidebarLink>
                <SidebarLink href="/logs" icon={ClipboardList}>Logs</SidebarLink>
                <SidebarLink href="/chat" icon={MessageCircle} badge={chatUnreadCount}>Chat</SidebarLink>
              </SidebarSection>
            )}

            {flags.showMarketingTools && (
              <SidebarSection title="Marketing">
                <SidebarLink href="/marketing" icon={Megaphone}>Marketing</SidebarLink>
                <SidebarLink href="/social-media" icon={Smartphone}>Social Media</SidebarLink>
              </SidebarSection>
            )}

            {flags.showPillarNav && (
              <SidebarSection title="Pillars">
                <SidebarLink href="/sales" icon={DollarSign}>Revenue</SidebarLink>
                <SidebarLink href="/labor" icon={UsersIcon}>Labor</SidebarLink>
                <SidebarLink href="/operations" icon={Settings}>Operations</SidebarLink>
                <SidebarLink href="/guest-experience" icon={Star}>Guest Experience</SidebarLink>
              </SidebarSection>
            )}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-2"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left overflow-hidden flex-1">
                    <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {profile?.full_name || profile?.email || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {profile?.email}
                    </span>
                  </div>
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
          </div>

          {/* Preview Role */}
          {isAdmin && (
            <div className="p-4 border-t border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start gap-2',
                      isPreview && 'border-amber-500 bg-amber-500/10 text-amber-600'
                    )}
                  >
                    <Eye className="h-4 w-4" />
                    {isPreview ? `Previewing: ${previewRoleLabel}` : 'Preview Role'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {(['owner', 'gm', 'lead', 'foh', 'boh'] as UserRole[]).map((r) => (
                    <DropdownMenuItem key={r} onClick={() => navigate(`/preview/${r}`)}>
                      {ROLE_LABELS[r]}
                    </DropdownMenuItem>
                  ))}
                  {isPreview && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setPreviewRole(null); navigate('/portfolio'); }}>
                        <X className="h-4 w-4 mr-2" /> Exit Preview
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <GlobalHeader showVenueSelector={!isPortfolioPage} showDateSelector={true} forceHideVenueSelector={isPortfolioPage} />
        <div className="flex-1 overflow-auto px-3 md:px-8 py-4 md:py-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      <FloatingAskButton />
      {isMobile && <PortfolioBottomNav />}
    </div>
  );
};
