-- Создаем таблицу для множественного назначения задач
CREATE TABLE IF NOT EXISTS task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'assignee', -- 'owner', 'assignee', 'watcher'
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    UNIQUE(task_id, user_id) -- Один пользователь не может быть назначен дважды на одну задачу
);

-- Индексы для быстрого поиска
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX idx_task_assignees_role ON task_assignees(role);

-- Мигрируем существующие данные из tasks.assignee_id в task_assignees
INSERT INTO task_assignees (task_id, user_id, role, assigned_at)
SELECT id, assignee_id, 'owner', created_at
FROM tasks
WHERE assignee_id IS NOT NULL;

-- Комментарий: assignee_id оставляем в таблице tasks для обратной совместимости,
-- но теперь основной источник данных - task_assignees
