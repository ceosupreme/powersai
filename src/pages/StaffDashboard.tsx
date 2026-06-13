import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { StaffLayout } from '@/components/staff/StaffLayout';
import type { Department } from '@/hooks/useStaffDepartment';

export type StaffOutletContext = {
  department: Department;
};

export const useStaffContext = () => useOutletContext<StaffOutletContext>();

const StaffDashboard = () => {
  return <StaffLayout />;
};

export default StaffDashboard;
