import { useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import { useStaffAnnouncements } from '@/hooks/useStaffAnnouncements';
import { getDismissedAnnouncements, dismissAnnouncement as persistDismiss } from '@/data/staffMockData';
import type { Department } from '@/hooks/useStaffDepartment';

interface StaffAnnouncementBannerProps {
  department: Department;
}

export const StaffAnnouncementBanner = ({ department }: StaffAnnouncementBannerProps) => {
  const [dismissed, setDismissed] = useState<string[]>(() => getDismissedAnnouncements());
  const { data: announcements = [] } = useStaffAnnouncements(department);

  const urgentAnnouncement = announcements.find(
    a => a.urgent && !dismissed.includes(a.id)
  );

  if (!urgentAnnouncement) return null;

  const handleDismiss = () => {
    persistDismiss(urgentAnnouncement.id);
    setDismissed(prev => [...prev, urgentAnnouncement.id]);
  };

  return (
    <div className="relative rounded-xl border border-gold/30 bg-gold/10 p-3">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="p-1.5 rounded-full bg-gold/20 flex-shrink-0 mt-0.5">
          <Megaphone className="h-4 w-4 text-gold" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{urgentAnnouncement.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{urgentAnnouncement.message}</p>
        </div>
      </div>
    </div>
  );
};
