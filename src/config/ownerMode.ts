/**
 * Owner-Only Mode Feature Flags
 * 
 * Controls visibility of features that are disabled in owner-only mode.
 * To re-enable any feature later, flip the corresponding boolean.
 * No components, routes, or pages are deleted — only conditionally hidden.
 */

export const ownerMode = {
  /** When true, the app operates in owner-only monitoring mode */
  enabled: true,

  /** Show staff-facing tools: Tasks, Logs, Chat */
  showStaffTools: false,

  /** Show marketing & social media pages */
  showMarketingTools: false,

  /** Show individual pillar pages in nav (content moved to Weekly Review) */
  showPillarNav: false,

  /** Show Preview Role toggle in sidebar */
  showPreviewRole: true,

  /** Show chat icon in header */
  showHeaderChat: false,

  /** Show GM log prompts and "Complete Today's Log" buttons */
  showGMLogPrompts: false,

  /** Show "+ New Task" / "+ Create Task" buttons */
  showCreateTaskButtons: false,
};

/**
 * Check if a nav route should be visible in owner mode.
 * Returns true if the route should be shown.
 */
export function isRouteVisible(path: string): boolean {
  if (!ownerMode.enabled) return true;

  const hiddenRoutes: Record<string, boolean> = {
    '/tasks': !ownerMode.showStaffTools,
    '/logs': !ownerMode.showStaffTools,
    '/logs/new': !ownerMode.showStaffTools,
    '/chat': !ownerMode.showStaffTools,
    '/marketing': !ownerMode.showMarketingTools,
    '/social-media': !ownerMode.showMarketingTools,
    '/sales': !ownerMode.showPillarNav,
    '/labor': !ownerMode.showPillarNav,
    '/operations': !ownerMode.showPillarNav,
    '/guest-experience': !ownerMode.showPillarNav,
  };

  return !hiddenRoutes[path];
}
