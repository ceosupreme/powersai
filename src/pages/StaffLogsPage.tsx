import { StaffLogsTab } from '@/components/staff/StaffLogsTab';
import { useStaffDepartment } from '@/hooks/useStaffDepartment';

const StaffLogsPage = () => {
  const { department } = useStaffDepartment();
  return <StaffLogsTab department={department} />;
};

export default StaffLogsPage;
