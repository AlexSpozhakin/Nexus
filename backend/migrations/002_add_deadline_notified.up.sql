-- Добавляем флаг для отслеживания отправленных уведомлений о дедлайне
ALTER TABLE tasks ADD COLUMN deadline_notified BOOLEAN DEFAULT false;

-- Индекс для ускорения проверки просроченных задач
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
