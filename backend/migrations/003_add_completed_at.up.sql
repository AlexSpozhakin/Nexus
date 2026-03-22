-- Добавляем поле completed_at для отслеживания времени завершения задачи
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMPTZ;

-- Создаем индекс для быстрого поиска по времени завершения
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);
