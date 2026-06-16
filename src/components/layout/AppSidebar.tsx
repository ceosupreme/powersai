import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  DollarSign, 
  Users, 
  Settings, 
  Star,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LogOut,
  Bell,
  User as UserIcon,
  Smartphone,
  ShieldCheck,
  CheckSquare,
  ClipboardList,
  Activity,
  Megaphone,
  MessageCircle,
  Eye,
  Crown,
  UserCog,
  UserCheck,
  User,
  X,
  Sunrise,
  Palette,
  Film,
  Briefcase,
  Inbox as InboxIcon,
  HelpCircle,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CountBadge } from '@/components/shared/CountBadge';
import { Profile, AppRole } from '@/types/auth';
import { useTaskBadgeCount } from '@/hooks/useTaskBadgeCount';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { PageKey, ROUTE_TO_PAGE_KEY } from '@/types/permissions';
import { useAuth } from '@/context/AuthContext';
import { usePreview } from '@/context/PreviewContext';
import { UserRole, ROLE_LABELS } from '@/types/roles';
import { NotificationPanel } from '@/components/staff/NotificationPanel';

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  pageKey: PageKey;
  hasBadge?: 'tasks' | 'chat';
};

type NavGroup = { label: string; items: NavItem[] };

// Agency-OS sidebar groups
const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { path: '/workspace', label: 'Today', icon: Sunrise, pageKey: 'dashboard' },
      { path: '/portfolio', label: 'Portfolio', icon: LayoutDashboard, pageKey: 'dashboard' },
      { path: '/weekly-review', label: 'Weekly Review', icon: CalendarCheck, pageKey: 'weekly_review' },
      { path: '/insights', label: 'Insights', icon: Lightbulb, pageKey: 'insights' },
    ],
  },
  {
    label: 'CRM & Sales',
    items: [
      { path: '/crm', label: 'CRM', icon: Briefcase, pageKey: 'crm' },
      { path: '/crm?tab=inbound', label: 'Inbound Leads', icon: InboxIcon, pageKey: 'crm' },
      { path: '/inbox', label: 'Capture Inbox', icon: InboxIcon, pageKey: 'capture_inbox' },
    ],
  },
  {
    label: 'Brand & Content',
    items: [
      { path: '/brand-kit', label: 'Brand Vault', icon: Palette, pageKey: 'brand_kit' },
      { path: '/content', label: 'Content Pipeline', icon: Film, pageKey: 'content_pipeline' },
      { path: '/revenue', label: 'Channel Revenue', icon: DollarSign, pageKey: 'revenue' },
      { path: '/marketing-hub', label: 'Marketing Hub', icon: Megaphone, pageKey: 'marketing_hub' },
      { path: '/growth-audit', label: 'Growth Audit', icon: Activity, pageKey: 'growth_audit' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/tasks', label: 'Tasks', icon: CheckSquare, hasBadge: 'tasks', pageKey: 'tasks' },
      { path: '/logs', label: 'Logs', icon: ClipboardList, pageKey: 'logs' },
      { path: '/chat', label: 'Chat', icon: MessageCircle, hasBadge: 'chat', pageKey: 'chat' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/help', label: 'Help', icon: HelpCircle, pageKey: 'dashboard' },
      { path: '/launch', label: 'Launch Checklist', icon: Rocket, pageKey: 'dashboard' },
      { path: '/admin', label: 'Settings', icon: Settings, pageKey: 'dashboard' },
    ],
  },
];

// Dev Tools removed - role preview handled by role system

const PREVIEW_ROLES: { role: UserRole; slug: string; icon: typeof Crown }[] = [
  { role: 'owner', slug: 'owner', icon: Crown },
  { role: 'gm', slug: 'gm', icon: UserCog },
  { role: 'lead', slug: 'lead', icon: UserCheck },
  { role: 'foh', slug: 'foh', icon: User },
  { role: 'boh', slug: 'boh', icon: User },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { data: taskBadgeCount } = useTaskBadgeCount();
  const { totalUnread: chatUnreadCount } = useUnreadCounts();
  const { canAccessPage, profile, role, isAdmin } = useAuth();
  const { isPreview, previewRole, setPreviewRole } = usePreview();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Filter groups + items based on page permissions; drop empty groups.
  const filteredGroups = useMemo(
    () =>
      navGroups
        .map((g) => ({ ...g, items: g.items.filter((i) => canAccessPage(i.pageKey)) }))
        .filter((g) => g.items.length > 0),
    [canAccessPage]
  );

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'owner':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'gm':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'shift_lead':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar 
      className="border-r border-sidebar-border bg-sidebar-background"
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-sans text-lg font-bold text-foreground tracking-tight">
                Supreme Team Media
              </span>
              {profile?.assigned_bar_name && (
                <span className="text-xs text-muted-foreground">
                  {profile.assigned_bar_name}
                </span>
              )}
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map((group, idx) => (
          <SidebarGroup
            key={group.label}
            className={cn(
              'p-2',
              idx > 0 && 'pt-0 border-t border-sidebar-border/50 mt-2'
            )}
          >
            {!isCollapsed && (
              <div className="px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
              </div>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const [pathOnly] = item.path.split('?');
                  const isActive = location.pathname === pathOnly;
                  const Icon = item.icon;
                  const badgeCount =
                    item.hasBadge === 'tasks'
                      ? taskBadgeCount
                      : item.hasBadge === 'chat'
                      ? chatUnreadCount
                      : 0;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link
                          to={item.path}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-primary hover:bg-sidebar-accent/50'
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                          )}
                          <div className="relative">
                            <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                            {item.hasBadge && (
                              <CountBadge
                                count={badgeCount}
                                max={9}
                                className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 justify-center"
                              />
                            )}
                          </div>
                          {!isCollapsed && (
                            <span className="font-medium flex-1">{item.label}</span>
                          )}
                          {!isCollapsed && item.hasBadge && (
                            <CountBadge count={badgeCount} className="ml-auto" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border space-y-2">
        {/* Role Preview Switcher - Admin Only */}
        {isAdmin && !isCollapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
                  isPreview && "bg-amber-500/10 text-amber-400"
                )}
              >
                <Eye className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium">
                  {isPreview ? `Previewing: ${ROLE_LABELS[previewRole!]}` : 'Preview Role'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">View as Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PREVIEW_ROLES.map(({ role: r, slug, icon: Icon }) => (
                <DropdownMenuItem
                  key={slug}
                  onClick={() => navigate(`/preview/${slug}`)}
                  className={cn(previewRole === r && "bg-accent")}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {ROLE_LABELS[r]}
                </DropdownMenuItem>
              ))}
              {isPreview && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setPreviewRole(null); navigate('/'); }}>
                    <X className="mr-2 h-4 w-4" />
                    Exit Preview
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isAdmin && isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("w-full", isPreview && "text-amber-400")}
            onClick={() => {
              if (isPreview) {
                setPreviewRole(null);
                navigate('/');
              }
            }}
            title={isPreview ? `Previewing: ${ROLE_LABELS[previewRole!]} — click to exit` : 'Preview Role'}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-auto py-2",
                isCollapsed && "justify-center px-2"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col items-start text-left overflow-hidden flex-1">
                  <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {profile?.full_name || profile?.email || 'User'}
                  </span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getRoleBadgeColor(role))}>
                    {role || 'staff'}
                  </Badge>
                </div>
              )}
              {!isCollapsed && <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />}
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
            {role === 'admin' && (
              <DropdownMenuItem asChild>
                <Link to="/admin" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
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

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
