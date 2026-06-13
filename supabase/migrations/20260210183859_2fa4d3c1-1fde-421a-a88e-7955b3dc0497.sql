
-- Step 1: Extend enums and update function only
ALTER TYPE log_position ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE log_type ADD VALUE IF NOT EXISTS 'staff_quick_log';
