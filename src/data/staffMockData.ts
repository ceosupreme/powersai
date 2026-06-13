// Clock status helpers (localStorage-based, intentionally local until time-tracking integration)
export const CLOCK_STATUS_KEY = 'staff-clock-status';
export const DISMISSED_ANNOUNCEMENTS_KEY = 'staff-dismissed-announcements';

export const getClockStatus = (): 'in' | 'out' => {
  return (localStorage.getItem(CLOCK_STATUS_KEY) as 'in' | 'out') || 'out';
};

export const setClockStatus = (status: 'in' | 'out') => {
  localStorage.setItem(CLOCK_STATUS_KEY, status);
};

export const getDismissedAnnouncements = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY) || '[]');
  } catch {
    return [];
  }
};

export const dismissAnnouncement = (id: string) => {
  const dismissed = getDismissedAnnouncements();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(dismissed));
  }
};
