import { usePreview } from '@/context/PreviewContext';
import { ownerMode } from '@/config/ownerMode';

/**
 * Preview-aware ownerMode flags.
 * When an admin is previewing a role, all feature flags open up
 * so the full UI for that role is visible.
 */
export function useOwnerMode() {
  const { isPreview } = usePreview();

  if (!ownerMode.enabled || isPreview) {
    return {
      enabled: ownerMode.enabled,
      showStaffTools: true,
      showMarketingTools: true,
      showPillarNav: true,
      showPreviewRole: true,
      showHeaderChat: true,
      showGMLogPrompts: true,
      showCreateTaskButtons: true,
    };
  }

  return ownerMode;
}

/**
 * Static helper for contexts outside React components (e.g. route arrays).
 */
export function isRouteVisibleForPreview(path: string, isPreview: boolean): boolean {
  if (!ownerMode.enabled || isPreview) return true;

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
