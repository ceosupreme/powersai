import { StaffChatTab } from '@/components/staff/StaffChatTab';
import { useStaffDepartment } from '@/hooks/useStaffDepartment';

const StaffChatPage = () => {
  const { department } = useStaffDepartment();
  return <StaffChatTab department={department} />;
};

export default StaffChatPage;
