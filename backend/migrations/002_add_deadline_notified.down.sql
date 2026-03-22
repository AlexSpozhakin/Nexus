-- Откатываем изменения
DROP INDEX IF EXISTS idx_tasks_due_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS deadline_notified;
