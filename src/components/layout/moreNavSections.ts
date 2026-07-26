import {
  Sunrise,
  CalendarCheck,
  LayoutDashboard,
  Briefcase,
  Inbox as InboxIcon,
  Zap,
  FileText,
  Activity,
  MessageSquare,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  Megaphone,
  Film,
  DollarSign,
  Palette,
  Tag,
  Package,
  Link2,
  Users,
  CheckSquare,
  ClipboardList,
  MessageCircle,
  HelpCircle,
  Rocket,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { PageKey } from '@/types/permissions';

export interface MoreNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  pageKey: PageKey;
  adminOnly?: boolean;
}

export interface MoreNavSection {
  label: string;
  items: MoreNavItem[];
}

/**
 * Shared More-sheet structure for mobile bottom navs.
 * "Daily" is pinned at top (operator's core loop). The remaining
 * sections MIRROR AppSidebar.tsx's group order + labels exactly so
 * mobile can never drift from desktop.
 */
export const MORE_SECTIONS: MoreNavSection[] = [
  {
    label: 'Daily',
    items: [
      { to: '/automations/inbox', label: 'Automation Inbox', icon: Zap, pageKey: 'automation_inbox' },
      { to: '/crm', label: 'CRM', icon: Briefcase, pageKey: 'crm' },
      { to: '/templates', label: 'Templates', icon: MessageSquare, pageKey: 'outreach_templates' },
      { to: '/automations/recovery-reports', label: 'Recovery Reports', icon: FileText, pageKey: 'recovery_reports' },
      { to: '/leak-stack', label: 'Leak Stack', icon: Activity, pageKey: 'leak_stack' },
      { to: '/prospects', label: 'Prospect Dock', icon: Target, pageKey: 'prospect_dock' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/workspace', label: 'Today', icon: Sunrise, pageKey: 'dashboard' },
      { to: '/portfolio', label: 'Portfolio', icon: LayoutDashboard, pageKey: 'dashboard' },
      { to: '/weekly-review', label: 'Weekly Review', icon: CalendarCheck, pageKey: 'weekly_review' },
      { to: '/insights', label: 'Insights', icon: Lightbulb, pageKey: 'insights' },
      { to: '/employees', label: 'Team', icon: Users, pageKey: 'employees' },
    ],
  },
  {
    label: 'Clients & Leads',
    items: [
      { to: '/inbox', label: 'Capture Inbox', icon: InboxIcon, pageKey: 'capture_inbox' },
      { to: '/automations/reactivation', label: 'Reactivation', icon: Sparkles, pageKey: 'reactivation' },
    ],
  },
  {
    label: 'Growth & Marketing',
    items: [
      { to: '/growth-audit', label: 'Growth Audit', icon: Activity, pageKey: 'growth_audit' },
      { to: '/foundation-audit', label: 'Foundation Audit', icon: ShieldCheck, pageKey: 'foundation_audit' },
      { to: '/marketing-hub', label: 'Marketing Hub', icon: Megaphone, pageKey: 'marketing_hub' },
      { to: '/content', label: 'Content', icon: Film, pageKey: 'content_pipeline' },
      { to: '/revenue', label: 'Channel Revenue', icon: DollarSign, pageKey: 'revenue' },
    ],
  },
  {
    label: 'Brand & Assets',
    items: [
      { to: '/brand-kit', label: 'Brand Kit', icon: Palette, pageKey: 'brand_kit' },
      { to: '/offers', label: 'Offers', icon: Tag, pageKey: 'offers' },
      { to: '/products', label: 'Products', icon: Package, pageKey: 'products' },
      { to: '/affiliate-programs', label: 'Affiliate Programs', icon: Link2, pageKey: 'affiliate_programs' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/tasks', label: 'Tasks', icon: CheckSquare, pageKey: 'tasks' },
      { to: '/logs', label: 'Logs', icon: ClipboardList, pageKey: 'logs' },
      { to: '/chat', label: 'Chat', icon: MessageCircle, pageKey: 'chat' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/help', label: 'Help', icon: HelpCircle, pageKey: 'dashboard' },
      { to: '/launch', label: 'Launch Checklist', icon: Rocket, pageKey: 'dashboard' },
      { to: '/admin', label: 'Settings', icon: Settings, pageKey: 'dashboard', adminOnly: true },
    ],
  },
];