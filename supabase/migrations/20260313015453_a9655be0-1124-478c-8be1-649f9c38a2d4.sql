
-- Clean up misaligned non-Monday week (2026-03-10 is a Tuesday) for Aero Club
DELETE FROM weekly_scorecard WHERE id = '52180f3a-5426-4eaf-a4c9-643ebbf7db0c';
DELETE FROM weekly_core WHERE id = '43851e74-0493-4c9e-bd2b-422a94ed4dd9';
DELETE FROM weeks WHERE id = '395a9006-1cf2-49f7-a944-b40f682dba5e';
