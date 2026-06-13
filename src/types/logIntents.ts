export type LogIntent =
  | 'incident'
  | 'accident'
  | 'maintenance'
  | 'guest_issue'
  | 'shift_notes'
  | 'shoutout'
  | 'voice_note'
  | '86_update'
  | 'daily_log';

export const intentConfig: Record<LogIntent, {
  icon: string;
  title: string;
  description: string;
  severity: string;
  roles: string[];
  form: 'staff_log' | 'voice_capture' | 'role_specific';
}> = {
  incident:    { icon: 'AlertCircle',    title: 'Incident',    description: 'Guest issue, altercation, safety', severity: 'high',     roles: ['owner','gm','lead','foh','boh'], form: 'staff_log' },
  accident:    { icon: 'ShieldAlert',    title: 'Accident',    description: 'Injury, slip, workers comp',       severity: 'critical', roles: ['owner','gm','lead','foh','boh'], form: 'staff_log' },
  maintenance: { icon: 'Wrench',         title: 'Maintenance', description: 'Equipment, repairs needed',        severity: 'medium',   roles: ['owner','gm','lead','foh','boh'], form: 'staff_log' },
  guest_issue: { icon: 'UserRound',      title: 'Guest Issue', description: 'Complaint, feedback',              severity: 'medium',   roles: ['owner','gm','lead','foh','boh'], form: 'staff_log' },
  shift_notes: { icon: 'FileText',       title: 'Shift Notes', description: 'Closing notes, observations',      severity: 'low',      roles: ['owner','gm','lead','foh','boh'], form: 'staff_log' },
  shoutout:    { icon: 'Star',           title: 'Shoutout',    description: 'Recognize a teammate',             severity: 'positive', roles: ['owner','gm','lead','foh','boh'], form: 'staff_log' },
  voice_note:  { icon: 'Mic',            title: 'Voice Note',  description: 'Quick voice capture',              severity: 'varies',   roles: ['owner','gm','lead','foh','boh'], form: 'voice_capture' },
  '86_update': { icon: 'CircleOff',      title: '86 Update',   description: 'Add or remove 86 items',           severity: 'low',      roles: ['lead','boh'],                    form: 'staff_log' },
  daily_log:   { icon: 'ClipboardCheck', title: 'Daily Log',   description: 'Full shift/day summary',           severity: 'low',      roles: ['owner','gm','lead'],             form: 'role_specific' },
};
