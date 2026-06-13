import { useOutletContext } from 'react-router-dom';
import { StaffTasksTab } from '@/components/staff/StaffTasksTab';
import type { Department } from '@/hooks/useStaffDepartment';

const StaffTasksPage = () => {
  const context = useOutletContext<{ department: Department } | null>();
  const department = context?.department ?? null;
  return <StaffTasksTab department={department} />;
};

export default StaffTasksPage;
