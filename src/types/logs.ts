// Log system types

export type LogPosition = 'general_manager' | 'shift_lead' | 'staff';
export type LogType = 'gm_log' | 'lead_log' | 'staff_quick_log';
export type FieldType = 'short_text' | 'long_text' | 'number' | 'boolean' | 'select' | 'date' | 'time' | 'rating_1_10';
export type LogStatus = 'draft' | 'submitted';

export interface UserPosition {
  id: string;
  user_id: string;
  position: LogPosition;
  created_at: string;
}

export interface FormField {
  id: string;
  key: string;
  label: string;
  field_type: FieldType;
  options_json: string[] | null;
  voice_enabled: boolean;
  created_at: string;
}

export interface LogTypeField {
  id: string;
  log_type: LogType;
  field_id: string;
  section: string;
  sort_order: number;
  required: boolean;
  condition_json: Record<string, unknown> | null;
  created_at: string;
  // Joined field data
  form_fields?: FormField;
}

export interface LogEntry {
  id: string;
  log_type: LogType;
  bar_id: string;
  created_by: string;
  status: LogStatus;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  // Joined data
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface LogEntryValue {
  id: string;
  log_entry_id: string;
  field_id: string;
  value_json: unknown;
  updated_at: string;
}

// Grouped fields by section for UI
export interface LogSection {
  name: string;
  fields: (LogTypeField & { form_fields: FormField })[];
}

// Form values map
export type LogFormValues = Record<string, unknown>;

// Position display info
export const POSITION_INFO: Record<LogPosition, { label: string; logType: LogType; logLabel: string }> = {
  general_manager: {
    label: 'General Manager',
    logType: 'gm_log',
    logLabel: 'GM Daily Log',
  },
  shift_lead: {
    label: 'Shift Lead',
    logType: 'lead_log',
    logLabel: 'Shift Lead Daily Log',
  },
  staff: {
    label: 'Staff',
    logType: 'staff_quick_log',
    logLabel: 'Staff Quick Log',
  },
};

export const LOG_TYPE_INFO: Record<LogType, { label: string; position: LogPosition }> = {
  gm_log: {
    label: 'GM Daily Log',
    position: 'general_manager',
  },
  lead_log: {
    label: 'Shift Lead Daily Log',
    position: 'shift_lead',
  },
  staff_quick_log: {
    label: 'Staff Quick Log',
    position: 'staff',
  },
};
