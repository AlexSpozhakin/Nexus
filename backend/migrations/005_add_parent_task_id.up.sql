-- Добавляем поле parent_task_id для поддержки вложенных задач (subtasks)
ALTER TABLE tasks ADD COLUMN parent_task_id UUID;

-- Добавляем внешний ключ на саму таблицу tasks (self-referencing foreign key)
ALTER TABLE tasks ADD CONSTRAINT tasks_parent_task_id_fkey
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска подзадач
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Комментарий для ясности структуры
COMMENT ON COLUMN tasks.parent_task_id IS 'ID родительской задачи. NULL если это основная задача, заполнено если это подзадача';
