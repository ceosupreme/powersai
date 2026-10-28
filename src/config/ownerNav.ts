import {
  Sunrise,
  LayoutDashboard,
  CalendarCheck,
  Lightbulb,
  Users,
  Briefcase,
  Inbox as InboxIcon,
  Zap,
  Sparkles,
  FileText,
  Activity,
  Target,
  ShieldCheck,
  Megaphone,
  Film,
  HelpCircle,
  DollarSign,
  Palette,
  Tag,
  Package,
  Link2,
  CheckSquare,
  ClipboardList,
  MessageCircle,
  MessageSquare,
  Rocket,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { PageKey } from '@/types/permissions';

export interface OwnerNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  pageKey: PageKey;
  hasBadge?: 'tasks' | 'chat';
  adminOnly?: boolean;
}

export interface OwnerNavGroup {
  label: string;
  items: OwnerNavItem[];
}

/**
 * The single source of truth for the operator navigation. The desktop sidebar
 * renders every group; the phone bottom bar pins PHONE_PRIMARY and the More
 * sheet renders the rest of the same groups, so the two can never drift.
 */
export const OWNER_NAV_GROUPS: OwnerNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { path: '/workspace', label: 'Today', icon: Sunrise, pageKey: 'dashboard' },
      { path: '/portfolio', label: 'Portfolio', icon: LayoutDashboard, pageKey: 'dashboard' },
      { path: '/weekly-review', label: 'Weekly Review', icon: CalendarCheck, pageKey: 'weekly_review' },
      { path: '/insights', label: 'Insights', icon: Lightbulb, pageKey: 'insights' },
      { path: '/employees', label: 'Team', icon: Users, pageKey: 'employees' },
    ],
  },
  {
    label: 'Clients & Leads',
    items: [
      { path: '/crm', label: 'CRM', icon: Briefcase, pageKey: 'crm' },
      { path: '/inbox', label: 'Capture Inbox', icon: InboxIcon, pageKey: 'capture_inbox' },
      { path: '/automations/inbox', label: 'Automation Inbox', icon: Zap, pageKey: 'automation_inbox' },
      { path: '/automations/reactivation', label: 'Reactivation', icon: Sparkles, pageKey: 'reactivation' },
      { path: '/automations/recovery-reports', label: 'Recovery Reports', icon: FileText, pageKey: 'recovery_reports' },
    ],
  },
  {
    label: 'Growth & Marketing',
    items: [
      { path: '/growth-audit', label: 'Growth Audit', icon: Activity, pageKey: 'growth_audit' },
      { path: '/leak-stack', label: 'Leak Stack', icon: Activity, pageKey: 'leak_stack' },
      { path: '/prospects', label: 'Prospect Dock', icon: Target, pageKey: 'prospect_dock' },
      { path: '/foundation-audit', label: 'Foundation Audit', icon: ShieldCheck, pageKey: 'foundation_audit' },
      { path: '/marketing-hub', label: 'Marketing Hub', icon: Megaphone, pageKey: 'marketing_hub' },
      { path: '/content', label: 'Content', icon: Film, pageKey: 'content_pipeline' },
      { path: '/production-board', label: 'Production Board', icon: Film, pageKey: 'content_pipeline', adminOnly: true },
      { path: '/answer-bank', label: 'Answer Bank', icon: HelpCircle, pageKey: 'content_pipeline', adminOnly: true },
      { path: '/revenue', label: 'Channel Revenue', icon: DollarSign, pageKey: 'revenue' },
    ],
  },
  {
    label: 'Brand & Assets',
    items: [
      { path: '/brand-kit', label: 'Brand Kit', icon: Palette, pageKey: 'brand_kit' },
      { path: '/offers', label: 'Offers', icon: Tag, pageKey: 'offers' },
      { path: '/products', label: 'Products', icon: Package, pageKey: 'products' },
      { path: '/affiliate-programs', label: 'Affiliate Programs', icon: Link2, pageKey: 'affiliate_programs' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/tasks', label: 'Tasks', icon: CheckSquare, hasBadge: 'tasks', pageKey: 'tasks' },
      { path: '/logs', label: 'Logs', icon: ClipboardList, pageKey: 'logs' },
      { path: '/chat', label: 'Chat', icon: MessageCircle, hasBadge: 'chat', pageKey: 'chat' },
      { path: '/templates', label: 'Outreach Templates', icon: MessageSquare, pageKey: 'outreach_templates' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/help', label: 'Help', icon: HelpCircle, pageKey: 'dashboard' },
      { path: '/launch', label: 'Launch Checklist', icon: Rocket, pageKey: 'dashboard' },
      { path: '/admin', label: 'Admin Panel', icon: Settings, pageKey: 'dashboard', adminOnly: true },
    ],
  },
];

/** The three screens pinned to the phone bottom bar (the rest live in More). */
export const PHONE_PRIMARY: OwnerNavItem[] = [
  { path: '/workspace', label: 'Today', icon: Sunrise, pageKey: 'dashboard' },
  { path: '/portfolio', label: 'Portfolio', icon: LayoutDashboard, pageKey: 'dashboard' },
  { path: '/inbox', label: 'Inbox', icon: InboxIcon, pageKey: 'capture_inbox' },
];
