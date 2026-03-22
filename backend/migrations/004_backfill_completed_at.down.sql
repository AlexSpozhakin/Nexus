-- Откатываем изменения: очищаем completed_at для задач которые были обновлены миграцией
-- (На практике откат не нужен, но добавляем для полноты)
UPDATE tasks
SET completed_at = NULL
WHERE status = 'done' AND completed_at = updated_at;
