import { useRole } from '@/context/RoleContext';
import { useMemo } from 'react';

export function usePermissions() {
  const { currentRole } = useRole();

  return useMemo(() => ({
    canViewAllVenues: currentRole === 'owner',
    canApproveInsights: ['owner', 'gm'].includes(currentRole!),
    canAssignTasks: ['owner', 'gm', 'lead'].includes(currentRole!),
    canViewFinancials: ['owner', 'gm'].includes(currentRole!),
    canViewStaffDetails: ['owner', 'gm', 'lead'].includes(currentRole!),
    canEnterGMLog: currentRole === 'gm',
    canEnterLeadLog: currentRole === 'lead',
    canEnterStaffLog: ['lead', 'foh', 'boh'].includes(currentRole!),
  }), [currentRole]);
}
