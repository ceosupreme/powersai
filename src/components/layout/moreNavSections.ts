import type { LucideIcon } from 'lucide-react';
import type { PageKey } from '@/types/permissions';
import { OWNER_NAV_GROUPS } from '@/config/ownerNav';

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
 * The More sheet renders the same groups as the desktop sidebar, generated
 * from one config (src/config/ownerNav.ts) so phone and desktop never drift.
 * Screens pinned to the bottom bar are removed by the caller via excludeRoutes.
 */
export const MORE_SECTIONS: MoreNavSection[] = OWNER_NAV_GROUPS.map((g) => ({
  label: g.label,
  items: g.items.map((i) => ({
    to: i.path,
    label: i.path === '/templates' ? 'Templates' : i.path === '/admin' ? 'Settings' : i.label,
    icon: i.icon,
    pageKey: i.pageKey,
    adminOnly: i.adminOnly,
  })),
}));
