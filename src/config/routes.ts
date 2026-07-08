import { UserRole } from '@/types/roles';

interface RouteConfig {
  roles: UserRole[];
}

export const routeConfig: Record<string, RouteConfig> = {
  // Owner-only routes
  '/portfolio': { roles: ['owner'] },
  '/dashboard': { roles: ['owner', 'gm', 'lead', 'foh', 'boh'] },
  '/admin': { roles: ['owner'] },
  '/growth-audit': { roles: ['owner'] },
  '/marketing-hub': { roles: ['owner'] },

  // Owner + GM routes
  '/weekly-review': { roles: ['owner', 'gm'] },
  '/insights': { roles: ['owner', 'gm'] },
  '/sales': { roles: ['owner', 'gm'] },
  '/labor': { roles: ['owner', 'gm'] },
  '/operations': { roles: ['owner', 'gm'] },
  '/guest-experience': { roles: ['owner', 'gm'] },
  '/employees': { roles: ['owner', 'gm'] },

  // Shared routes (all roles)
  '/tasks': { roles: ['owner', 'gm', 'lead', 'foh', 'boh'] },
  '/logs': { roles: ['owner', 'gm', 'lead', 'foh', 'boh'] },
  '/chat': { roles: ['owner', 'gm', 'lead', 'foh', 'boh'] },

  // Shift/staff routes
  '/staff/shift': { roles: ['lead'] },
  '/staff/my-shift': { roles: ['foh', 'boh'] },
  '/staff/tasks': { roles: ['lead', 'foh', 'boh'] },
  '/staff/chat': { roles: ['lead', 'foh', 'boh'] },
  '/staff/logs': { roles: ['lead', 'foh', 'boh'] },

  // Client approver (only surface for the client role)
  '/approvals': { roles: ['client'] },
};

/**
 * Get the allowed roles for a given pathname.
 * Returns null if no config found (allow all authenticated users).
 */
export function getAllowedRoles(pathname: string): UserRole[] | null {
  // Direct match
  if (routeConfig[pathname]) {
    return routeConfig[pathname].roles;
  }

  // Prefix match for dynamic routes (e.g., /logs/new, /logs/:id, /logs/:id/edit)
  const sortedPatterns = Object.keys(routeConfig).sort((a, b) => b.length - a.length);
  for (const pattern of sortedPatterns) {
    if (pathname.startsWith(pattern + '/')) {
      return routeConfig[pattern].roles;
    }
  }

  return null;
}
