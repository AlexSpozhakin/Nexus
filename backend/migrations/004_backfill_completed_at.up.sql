-- Заполняем completed_at для существующих завершенных задач
-- Используем updated_at как примерное время завершения
UPDATE tasks
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;
