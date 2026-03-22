-- Откатываем миграцию множественного назначения задач
DROP INDEX IF EXISTS idx_task_assignees_role;
DROP INDEX IF EXISTS idx_task_assignees_user_id;
DROP INDEX IF EXISTS idx_task_assignees_task_id;
DROP TABLE IF EXISTS task_assignees;
