# Техническая спецификация — Task Manager (ВКР)

> Документ для AI-агентов. Каждый модуль описан до уровня реализации без уточнений.
> Стек: Go + Gin + PostgreSQL 16 + Redis 7 + Kafka + WebSocket | React 19 + TypeScript + Zustand + Tailwind CSS 4

---

## Модуль 1 — Аутентификация

### User Stories
- Как новый пользователь, я хочу зарегистрироваться по email/username/password, чтобы получить доступ к приложению
- Как зарегистрированный пользователь, я хочу войти и получить JWT-токен, чтобы использовать защищённые endpoints
- Как авторизованный пользователь, я хочу получить свои данные через GET /me, чтобы отобразить профиль
- Как пользователь, я хочу изменить username или пароль, чтобы обновить профиль
- Как пользователь, я хочу видеть свою статистику (задач выполнено, команд), чтобы отслеживать активность

### Модель данных
```sql
users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  username      text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
)
```

### API
```
POST /api/v1/auth/register
  Body: { email: string, username: string, password: string (min 6) }
  201: { id, email, username, token, created_at }
  400: validation error
  409: email or username already exists

POST /api/v1/auth/login
  Body: { email: string, password: string }
  200: { id, email, username, token }
  401: invalid credentials

GET /api/v1/auth/me                              [protected]
  200: { id, email, username, created_at }
  401: missing/invalid token

PUT /api/v1/auth/profile                         [protected]
  Body: { username?: string, password?: string, new_password?: string }
  200: { id, email, username }
  400: validation error
  409: username taken

GET /api/v1/auth/stats?period=week|month|all     [protected]
  200: { tasks_completed: int, tasks_created: int, teams_count: int, comments_count: int }
```

### Бизнес-логика
- Пароль хэшируется bcrypt (cost 10)
- JWT: HS256, payload {user_id, email}, exp: 24ч
- Token в заголовке: `Authorization: Bearer {token}`
- Middleware извлекает userID в `c.Set("userID", claims.UserID)`
- Смена пароля: требует текущий password (поле `password`), новый (поле `new_password`)

### Крайние случаи
- Регистрация с занятым email → 409 с сообщением "email already exists"
- Логин с несуществующим email → 401 (не раскрывать, существует ли email)
- PUT /profile без изменений → 200, данные без изменений
- Истёкший JWT → 401 "token expired"

---

## Модуль 2 — Команды (Teams)

### User Stories
- Как пользователь, я хочу создать команду, чтобы организовать совместную работу
- Как владелец команды, я хочу приглашать участников по email, чтобы расширять команду
- Как администратор команды, я хочу менять роли участников, чтобы управлять правами
- Как участник команды, я хочу видеть всех членов команды и их статус онлайн, чтобы координировать работу
- Как владелец, я хочу удалить команду, чтобы завершить проект

### Модель данных
```sql
teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  owner_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
)

team_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id   uuid REFERENCES users(id) ON DELETE CASCADE,
  role      text NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
)

Индексы:
  idx_team_members_team_id ON team_members(team_id)
  idx_team_members_user_id ON team_members(user_id)
```

### API
```
GET    /api/v1/teams                              [protected]
  200: [{ id, name, description, owner_id, member_count, created_at }]

POST   /api/v1/teams                              [protected]
  Body: { name: string, description?: string }
  201: { id, name, description, owner_id, created_at }
  400: name required

GET    /api/v1/teams/{id}                         [protected]
  200: { id, name, description, owner_id, members[], created_at }
  403: not a member
  404: team not found

PUT    /api/v1/teams/{id}                         [protected, owner/admin]
  Body: { name?: string, description?: string }
  200: updated team

DELETE /api/v1/teams/{id}                         [protected, owner only]
  204: no content
  403: not owner

GET    /api/v1/teams/{id}/members                 [protected]
  200: [{ user_id, email, username, role, joined_at }]

POST   /api/v1/teams/{id}/members                 [protected, owner/admin]
  Body: { email: string, role: 'admin'|'member' }
  201: { user_id, email, username, role }
  404: user with email not found
  409: already a member

DELETE /api/v1/teams/{id}/members/{userId}        [protected, owner/admin]
  204: no content
  403: cannot remove owner

PATCH  /api/v1/teams/{id}/members/{userId}/role   [protected, owner/admin]
  Body: { role: 'admin'|'member' }
  200: updated member

GET    /api/v1/teams/{id}/online                  [protected]
  200: { online_user_ids: uuid[] }
```

### Бизнес-логика
- Создатель команды автоматически добавляется как admin + owner
- Владелец (owner_id) не может быть удалён из команды
- Только owner/admin могут приглашать и удалять участников
- Только owner может удалить команду
- GET /teams возвращает только команды, где пользователь является членом
- Статус онлайн: пользователь онлайн если есть активное WebSocket соединение в Hub

### Крайние случаи
- Попытка удалить владельца из команды → 403
- Приглашение уже состоящего в команде → 409
- Изменение роли владельца через PATCH → 403 (владелец всегда admin)
- Удаление команды удаляет все задачи, заметки, метки каскадно

---

## Модуль 3 — Задачи (Tasks)

### User Stories
- Как участник команды, я хочу создавать задачи с приоритетом и дедлайном, чтобы планировать работу
- Как исполнитель, я хочу менять статус задачи, чтобы отражать прогресс
- Как менеджер, я хочу назначать несколько исполнителей на задачу, чтобы организовать командную работу
- Как пользователь, я хочу создавать подзадачи, чтобы декомпозировать сложные задачи
- Как пользователь, я хочу видеть мои задачи (назначенные на меня), чтобы отслеживать персональную нагрузку

### Модель данных
```sql
tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           uuid REFERENCES teams(id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text,
  status            text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority          text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id       uuid REFERENCES users(id) ON DELETE SET NULL,  -- legacy поле (deprecated)
  creator_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  due_date          timestamptz,
  completed_at      timestamptz,
  parent_task_id    uuid REFERENCES tasks(id) ON DELETE CASCADE,
  deadline_notified boolean DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
)

task_assignees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'assignee' CHECK (role IN ('owner', 'assignee', 'watcher')),
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(task_id, user_id)
)

Индексы:
  idx_tasks_team_id    ON tasks(team_id)
  idx_tasks_assignee_id ON tasks(assignee_id)
  idx_tasks_status     ON tasks(status)
```

### API
```
GET    /api/v1/tasks/my                           [protected]
  200: [задачи где userID в task_assignees или assignee_id]

POST   /api/v1/teams/{id}/tasks                   [protected]
  Body: {
    title: string,
    description?: string,
    priority?: 'low'|'medium'|'high'|'urgent',
    assignees?: [{ user_id: uuid, role: 'assignee'|'watcher' }],
    due_date?: RFC3339,
    parent_task_id?: uuid
  }
  201: task object с assignees[]
  400: title required
  403: not a team member

GET    /api/v1/teams/{id}/tasks                   [protected]
  Query: status?, priority?, assignee_id?
  200: [task objects с assignees[]]

GET    /api/v1/tasks/{id}                         [protected]
  200: { task fields + assignees[], labels[], subtasks_count }
  404: not found

GET    /api/v1/tasks/{id}/subtasks                [protected]
  200: [tasks where parent_task_id = id]

PUT    /api/v1/tasks/{id}                         [protected]
  Body: {
    title?, description?, status?, priority?,
    assignees?: [{ user_id, role }],
    due_date?
  }
  200: updated task
  Trigger: уведомления при смене статуса или assignees

DELETE /api/v1/tasks/{id}                         [protected]
  204: no content
  Trigger: уведомление task_deleted всем assignees и creator
```

### Бизнес-логика
- При создании задачи creator_id = текущий userID
- completed_at заполняется автоматически при status = 'done'
- При смене assignees: удалить старые записи в task_assignees, вставить новые
- deadline_notified = false сбрасывается при изменении due_date
- Подзадачи: parent_task_id указывает на родительскую задачу
- GET /tasks/my: поиск по task_assignees.user_id + tasks.assignee_id (legacy)
- Уведомление при смене статуса → NotifyTaskStatusChanged для всех assignees и creator
- Уведомление при назначении → NotifyTaskAssigned для новых assignees

### Крайние случаи
- Назначение пользователя не из команды → 400 "user not in team"
- Удаление задачи с подзадачами → подзадачи удаляются каскадно (ON DELETE CASCADE)
- Смена due_date → сбросить deadline_notified = false (планировщик пересчитает)
- Задача без assignees → допустимо

---

## Модуль 4 — Комментарии (Comments)

### User Stories
- Как участник команды, я хочу оставлять комментарии к задаче, чтобы обсуждать детали
- Как автор комментария, я хочу редактировать свой комментарий, чтобы исправить ошибку
- Как автор комментария, я хочу удалить свой комментарий, чтобы убрать неактуальную информацию
- Как пользователь, я хочу видеть все комментарии к задаче в хронологическом порядке

### Модель данных
```sql
comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  content    text NOT NULL,
  is_edited  boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

Индекс: idx_comments_task_id ON comments(task_id)
```

### API
```
POST   /api/v1/tasks/{id}/comments                [protected]
  Body: { content: string (min 1) }
  201: { id, task_id, user_id, username, content, is_edited, created_at }
  Trigger: NotifyNewComment → всем assignees и creator (кроме автора)

GET    /api/v1/tasks/{id}/comments                [protected]
  200: [{ id, task_id, user_id, username, content, is_edited, created_at, updated_at }]
  Сортировка: created_at ASC

PUT    /api/v1/tasks/{id}/comments/{commentId}    [protected, author only]
  Body: { content: string }
  200: updated comment с is_edited = true
  403: not author

DELETE /api/v1/tasks/{id}/comments/{commentId}    [protected, author only]
  204: no content
  403: not author
```

### Бизнес-логика
- is_edited = true при любом PUT
- updated_at обновляется при редактировании
- Только автор может редактировать/удалять свой комментарий
- При добавлении комментария: уведомить creator задачи и всех assignees (кроме самого комментатора)

### Крайние случаи
- Пустой content → 400
- Комментарий к удалённой задаче → 404 task not found
- Редактирование чужого комментария → 403

---

## Модуль 5 — Заметки (Notes)

### User Stories
- Как участник команды, я хочу создавать заметки для команды, чтобы хранить общую информацию
- Как автор заметки, я хочу решать, делиться ли заметкой с командой (is_shared), чтобы контролировать видимость
- Как участник команды, я хочу просматривать общие заметки, чтобы быть в курсе важной информации

### Модель данных
```sql
notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid REFERENCES teams(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  title      text NOT NULL,
  content    text,
  is_shared  boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

Индексы:
  idx_notes_team_id   ON notes(team_id)
  idx_notes_author_id ON notes(author_id)
```

### API
```
POST   /api/v1/teams/{id}/notes                   [protected]
  Body: { title: string, content?: string, is_shared?: boolean }
  201: note object

GET    /api/v1/teams/{id}/notes                   [protected]
  200: [заметки где is_shared=true ИЛИ author_id=userID]

GET    /api/v1/notes/{id}                         [protected]
  200: note object
  403: private note, not author

PUT    /api/v1/notes/{id}                         [protected, author only]
  Body: { title?, content?, is_shared? }
  200: updated note

DELETE /api/v1/notes/{id}                         [protected, author only]
  204: no content
```

### Бизнес-логика
- GET /teams/{id}/notes: возвращает заметки (is_shared=true) + личные заметки текущего пользователя
- Только автор может редактировать/удалять заметку
- is_shared=false → видна только автору

### Крайние случаи
- Доступ к чужой приватной заметке → 403
- Удаление участника команды → его приватные заметки остаются (автор SET NULL нельзя, скрываются)

---

## Модуль 6 — Вложения (Attachments)

### User Stories
- Как пользователь, я хочу прикреплять файлы к задачам, чтобы предоставить контекст
- Как пользователь, я хочу скачивать вложения, чтобы получить прикреплённые файлы
- Как пользователь, я хочу предпросматривать изображения и PDF, чтобы не скачивать каждый файл
- Как участник команды, я хочу прикреплять файлы к команде (не к конкретной задаче), чтобы хранить общие документы

### Модель данных
```sql
attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid REFERENCES tasks(id) ON DELETE CASCADE,
  team_id      uuid REFERENCES teams(id) ON DELETE CASCADE,
  uploaded_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  file_name    text NOT NULL,
  file_size    bigint NOT NULL,
  mime_type    text NOT NULL,
  storage_path text NOT NULL,
  created_at   timestamptz DEFAULT now()
)
-- task_id OR team_id, не оба (один из них NULL)
```

### API
```
POST   /api/v1/tasks/{id}/attachments             [protected]
  Body: multipart/form-data, field: file
  201: { id, file_name, file_size, mime_type, uploaded_by, created_at }
  413: file too large (>10MB)

GET    /api/v1/tasks/{id}/attachments             [protected]
  200: [attachment objects]

POST   /api/v1/teams/{id}/attachments             [protected]
  Body: multipart/form-data, field: file
  201: attachment object

GET    /api/v1/teams/{id}/attachments             [protected]
  200: [attachment objects]

GET    /api/v1/attachments/{id}/download          [protected]
  200: file binary stream, Content-Disposition: attachment
  404: not found

GET    /api/v1/attachments/{id}/preview           [protected]
  200: file binary stream (для image/* и application/pdf)
  400: preview not supported for this file type

DELETE /api/v1/attachments/{id}                   [protected]
  204: no content
  403: not uploader
```

### Бизнес-логика
- Файлы хранятся локально: backend/uploads/tasks/{task_id}/ или backend/uploads/teams/{team_id}/
- Имя файла: uuid + оригинальное расширение (например: a1b2c3d4.pdf)
- Максимальный размер: 10MB
- Preview поддерживается для: image/*, application/pdf
- Удалить может только uploader или admin команды

### Крайние случаи
- Файл больше 10MB → 413 Request Entity Too Large
- Попытка preview для .zip → 400 "preview not supported"
- Удаление задачи → все вложения удаляются каскадно + физические файлы (ON DELETE CASCADE в БД, файлы — в defer)

---

## Модуль 7 — Метки (Labels)

### User Stories
- Как участник команды, я хочу создавать метки с цветом, чтобы категоризировать задачи
- Как пользователь, я хочу добавлять метки к задачам, чтобы быстро идентифицировать тип задачи
- Как менеджер, я хочу видеть статистику использования меток, чтобы анализировать типы задач

### Модель данных
```sql
labels (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid REFERENCES teams(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text NOT NULL,  -- HEX цвет, например "#6366f1"
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
)

task_labels (
  task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
  label_id    uuid REFERENCES labels(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (task_id, label_id)
)
```

### API
```
GET    /api/v1/teams/{id}/labels                  [protected]
  200: [{ id, name, color, team_id, created_by, created_at }]

POST   /api/v1/teams/{id}/labels                  [protected]
  Body: { name: string, color: string (HEX) }
  201: label object

GET    /api/v1/teams/{id}/labels/stats            [protected]
  200: [{ label_id, label_name, color, task_count }]

PUT    /api/v1/labels/{labelId}                   [protected]
  Body: { name?, color? }
  200: updated label

DELETE /api/v1/labels/{labelId}                   [protected]
  204: no content (удаляет из task_labels каскадно)

GET    /api/v1/tasks/{id}/labels                  [protected]
  200: [label objects]

POST   /api/v1/tasks/{id}/labels                  [protected]
  Body: { label_id: uuid }
  201: added label

DELETE /api/v1/tasks/{id}/labels/{labelId}        [protected]
  204: no content
```

### Бизнес-логика
- Метка принадлежит команде, добавлять к задачам можно только метки той же команды
- Удаление метки → убирает из всех задач (cascade)
- color — HEX строка без валидации на сервере (валидация на фронте)

### Крайние случаи
- Добавление метки другой команды к задаче → 400 "label not in team"
- Дублирование метки к задаче → игнорировать (UPSERT или проверка)

---

## Модуль 8 — Поиск (Search)

### User Stories
- Как пользователь, я хочу искать по задачам и заметкам всех моих команд, чтобы быстро найти нужную информацию
- Как пользователь, я хочу видеть подсветку совпадений в результатах поиска

### API
```
GET    /api/v1/search?q={query}                   [protected]
  200: {
    tasks: [{ id, type:'task', title, excerpt, team_id, team_name, status, priority, created_at }],
    notes: [{ id, type:'note', title, excerpt, team_id, team_name, created_at }],
    total: int
  }
  400: q required (min 2 символа)
```

### Бизнес-логика
- Поиск только по командам пользователя (WHERE team_id IN (...user's teams...))
- Full-text поиск по полям: tasks.title, tasks.description, notes.title, notes.content
- excerpt: первые 150 символов контента с совпадением
- Минимум 2 символа в запросе

### Крайние случаи
- Запрос 1 символ → 400
- Нет результатов → 200 { tasks: [], notes: [], total: 0 }
- Спецсимволы в запросе → экранировать для LIKE/tsquery

---

## Модуль 9 — Отслеживание времени (Time Tracking)

### User Stories
- Как пользователь, я хочу логировать время работы над задачей, чтобы учитывать затраченные усилия
- Как менеджер, я хочу видеть суммарное время по задаче, чтобы оценивать трудозатраты
- Как пользователь, я хочу удалять ошибочные записи времени

### Модель данных
```sql
time_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES users(id) ON DELETE SET NULL,
  started_at       timestamptz NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  note             text,
  created_at       timestamptz DEFAULT now()
)
```

### API
```
POST   /api/v1/tasks/{id}/time                    [protected]
  Body: { started_at: RFC3339, duration_seconds: int, note?: string }
  201: time_entry object

GET    /api/v1/tasks/{id}/time                    [protected]
  200: {
    entries: [{ id, user_id, username, started_at, duration_seconds, note, created_at }],
    total_seconds: int
  }

DELETE /api/v1/time/{id}                          [protected, author only]
  204: no content
  403: not author
```

### Бизнес-логика
- duration_seconds > 0 обязательно
- total_seconds = SUM(duration_seconds) для всех записей задачи
- Только автор записи может её удалить

### Крайние случаи
- duration_seconds = 0 или отрицательное → 400
- Удаление чужой записи → 403

---

## Модуль 10 — Уведомления (Notifications)

### User Stories
- Как пользователь, я хочу получать real-time уведомления о назначении на задачу
- Как пользователь, я хочу получать уведомление при смене статуса задачи, где я участвую
- Как пользователь, я хочу получать уведомление о новых комментариях в моих задачах
- Как пользователь, я хочу получать предупреждение за 24 часа до дедлайна задачи
- Как пользователь, я хочу управлять типами уведомлений в настройках

### Архитектура
```
Handler (task.go/comment.go)
    ↓
notification_service.go
    ├── Фильтрация: не отправлять автору действия
    ├── WebSocket: hub.SendToUser(userID, type, title, content, data)
    └── Kafka: producer.SendMessage("notifications", payload JSON)
         ↓
websocket/hub.go
    └── Отправка всем активным соединениям пользователя

scheduler/deadline_checker.go
    ├── Каждую минуту: SELECT tasks WHERE due_date BETWEEN now() AND now()+24h AND deadline_notified=false
    └── NotifyDeadlineAlert → SET deadline_notified=true
```

### WebSocket протокол
```
Endpoint: GET /ws?user_id={UUID}
Auth: нет JWT (пользователь сам передаёт свой user_id)

Message format (сервер → клиент):
{
  "type": "task_assigned" | "task_status_changed" | "new_comment" | "task_deleted" | "deadline_alert",
  "title": "Notification title",
  "content": "Notification text",
  "data": {
    "task_id": "uuid",
    "task_title": "string",
    "team_id": "uuid"
  }
}
```

### Типы уведомлений
| Тип | Триггер | Получатели | Фильтр |
|-----|---------|------------|--------|
| task_assigned | Создание/обновление assignees | Новые assignees | assigneeID != actionAuthorID |
| task_status_changed | PUT /tasks/{id} (status changed) | Все assignees + creator | userID != actionAuthorID |
| new_comment | POST /tasks/{id}/comments | Все assignees + creator | commenterID != recipientID |
| task_deleted | DELETE /tasks/{id} | Все assignees + creator | deletedByID != recipientID |
| deadline_alert | Scheduler (каждую минуту) | Все assignees + creator | Автоматически |

### Настройки уведомлений (Frontend)
```typescript
NotificationSettings {
  soundEnabled: boolean      // звук при уведомлении
  newComment: boolean        // фильтр: показывать new_comment
  taskAssigned: boolean      // фильтр: показывать task_assigned
  teamEvents: boolean        // фильтр: показывать task_status_changed, task_deleted
  taskOverdue: boolean       // фильтр: показывать deadline_alert
}
// Хранятся в Zustand + localStorage
```

### Крайние случаи
- WebSocket разрыв → клиент переподключается (NotificationManager.tsx)
- Пользователь офлайн → уведомление теряется (нет persistence)
- Несколько вкладок одного пользователя → Hub доставляет во все соединения

---

## Модуль 11 — Аналитика (TeamAnalytics)

### User Stories
- Как менеджер, я хочу видеть статистику команды (задачи по статусам, по исполнителям, по приоритетам)
- Как пользователь, я хочу видеть трендовые графики за разные периоды (неделя/месяц/всё время)

### Компоненты Frontend
```
TeamAnalytics.tsx (44KB):
  - Задачи по статусам: todo/in_progress/done (bar chart или counts)
  - Задачи по приоритетам: low/medium/high/urgent
  - Задачи по исполнителям: кто сколько
  - Временная шкала: выполненные задачи за период
  - Топ участников по активности
```

### API (использует существующие endpoints)
```
GET /api/v1/auth/stats?period=week|month|all    → персональная статистика
GET /api/v1/teams/{id}/tasks                    → все задачи команды (для агрегации на фронте)
GET /api/v1/teams/{id}/labels/stats             → статистика меток
```

### Бизнес-логика
- Агрегация происходит на frontend из данных задач
- Период фильтрации: week = последние 7 дней, month = последние 30 дней

---

## UI/UX Паттерны (обязательные)

### Дизайн-система
- **Тема**: dark first (bg-gray-900, bg-gray-800, bg-gray-700)
- **Инпуты**: `bg-gray-700/50 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-indigo-500`
- **Кнопки primary**: `bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4 py-2`
- **Карточки**: `bg-gray-800 rounded-2xl p-4 border border-gray-700/50`
- **Priority badges**: pill с dot + текст, прозрачный фон (НЕ solid background)
  - urgent: `text-red-400 bg-red-400/10`
  - high: `text-orange-400 bg-orange-400/10`
  - medium: `text-yellow-400 bg-yellow-400/10`
  - low: `text-green-400 bg-green-400/10`
- **Status badges**: аналогично pill стиль
- **Inline edit**: разные `key` на edit/view state, `animate-edit-in` анимация

### GlobalSearch
- Две отдельные карточки: input card + results card
- Stagger анимация результатов
- Подсветка совпадений в тексте

### NotificationBell
- Иконка + счётчик непрочитанных
- Dropdown список последних уведомлений
- Звук при новом уведомлении (если soundEnabled)

### i18n
- Все строки UI через `translations.ts`
- Языки: `en`, `ru`
- Переключатель в SettingsMenu

---

## Database Schema (сводная)

```sql
-- Порядок создания (учитывать FK зависимости):
1. users
2. teams
3. team_members (FK → teams, users)
4. tasks (FK → teams, users)
5. notes (FK → teams, users)
6. comments (FK → tasks, users)
7. task_assignees (FK → tasks, users)
8. attachments (FK → tasks, teams, users)
9. labels (FK → teams, users)
10. task_labels (FK → tasks, labels)
11. time_entries (FK → tasks, users)
```

---

## Конфигурация

### Backend (config.go)
```go
Config {
  Server: { Port: "8080" }
  DB: {
    Host: "localhost", Port: "5432",
    User: "taskmanager", Password: "taskmanager123", DBName: "taskmanager"
  }
  Redis: { Host: "localhost", Port: "6379" }
  Kafka: { Brokers: ["localhost:9092"], Topic: "notifications" }
  JWT: { Secret: "your-super-secret-key-change-in-production", ExpireTime: 24h }
}
```

### Frontend (vite.config.ts)
```typescript
proxy: {
  '/api': 'http://localhost:8080',
  '/ws': { target: 'ws://localhost:8080', ws: true }
}
```

---

## Что планируется доработать (возможные фичи ВКР)

- [ ] Nginx конфигурация для prod (папка nginx/ пустая)
- [ ] Activity log (история действий по задаче)
- [ ] Kanban board view (колонки по статусам)
- [ ] Экспорт задач в CSV/PDF
- [ ] Email уведомления (через Kafka consumer)
- [ ] Persistent notifications (хранение в БД)
- [ ] Аватары пользователей
- [ ] Markdown поддержка в описании задач и заметках
