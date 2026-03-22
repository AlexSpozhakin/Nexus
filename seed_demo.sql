-- ============================================================
-- DEMO SEED: Команда "Nexus Digital" — 30 дней активности
-- Пароль всех пользователей: Demo1234!
-- bcrypt cost=14 hash для "Demo1234!"
-- ============================================================

-- ── 1. ПОЛЬЗОВАТЕЛИ ─────────────────────────────────────────
INSERT INTO users (id, email, username, password_hash, created_at, updated_at) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'maria.k@nexus.io',   'Maria_K',    '$2a$14$ht9KG8kmDayUOuIVTE98g.aUExXqJt2H7FMkohG3dDsky.y70edc.', NOW() - INTERVAL '60 days', NOW()),
  ('a1000001-0000-0000-0000-000000000002', 'dmitry.v@nexus.io',  'Dmitry_V',   '$2a$14$ht9KG8kmDayUOuIVTE98g.aUExXqJt2H7FMkohG3dDsky.y70edc.', NOW() - INTERVAL '60 days', NOW()),
  ('a1000001-0000-0000-0000-000000000003', 'anna.s@nexus.io',    'Anna_S',     '$2a$14$ht9KG8kmDayUOuIVTE98g.aUExXqJt2H7FMkohG3dDsky.y70edc.', NOW() - INTERVAL '55 days', NOW()),
  ('a1000001-0000-0000-0000-000000000004', 'nikita.p@nexus.io',  'Nikita_P',   '$2a$14$ht9KG8kmDayUOuIVTE98g.aUExXqJt2H7FMkohG3dDsky.y70edc.', NOW() - INTERVAL '50 days', NOW()),
  ('a1000001-0000-0000-0000-000000000005', 'elena.r@nexus.io',   'Elena_R',    '$2a$14$ht9KG8kmDayUOuIVTE98g.aUExXqJt2H7FMkohG3dDsky.y70edc.', NOW() - INTERVAL '45 days', NOW()),
  ('a1000001-0000-0000-0000-000000000006', 'sergey.m@nexus.io',  'Sergey_M',   '$2a$14$ht9KG8kmDayUOuIVTE98g.aUExXqJt2H7FMkohG3dDsky.y70edc.', NOW() - INTERVAL '40 days', NOW())
ON CONFLICT (email) DO NOTHING;

-- ── 2. КОМАНДА ──────────────────────────────────────────────
INSERT INTO teams (id, name, description, owner_id, created_at, updated_at) VALUES
  ('b2000001-0000-0000-0000-000000000001',
   'Nexus Digital',
   'Команда по разработке корпоративного продукта. Спринты, дедлайны, полная аналитика.',
   'a1000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '35 days', NOW())
ON CONFLICT DO NOTHING;

-- ── 3. УЧАСТНИКИ ────────────────────────────────────────────
INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'owner',  NOW() - INTERVAL '35 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002', 'admin',  NOW() - INTERVAL '34 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000003', 'member', NOW() - INTERVAL '33 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004', 'member', NOW() - INTERVAL '30 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000005', 'member', NOW() - INTERVAL '28 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000006', 'member', NOW() - INTERVAL '25 days')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ── 4. ЗАДАЧИ (30 дней, разные статусы, приоритеты, дедлайны) ───
-- Статусы: todo | in_progress | done | cancelled
-- Приоритеты: low | medium | high | urgent

-- === SPRINT 1 (30-22 дня назад) ===

-- Задача 1: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'b2000001-0000-0000-0000-000000000001',
   'Настройка CI/CD пайплайна', 'Настроить GitHub Actions: build, test, deploy на staging.',
   'done', 'high',
   'a1000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '25 days',
   NOW() - INTERVAL '26 days',
   NOW() - INTERVAL '30 days', NOW());

-- Задача 2: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000002', 'b2000001-0000-0000-0000-000000000001',
   'Дизайн главной страницы', 'Разработать макеты в Figma: hero, features, pricing, footer.',
   'done', 'medium',
   'a1000001-0000-0000-0000-000000000002',
   NOW() - INTERVAL '23 days',
   NOW() - INTERVAL '24 days',
   NOW() - INTERVAL '30 days', NOW());

-- Задача 3: DONE, просрочена
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000003', 'b2000001-0000-0000-0000-000000000001',
   'Написать техническое задание', 'ТЗ для backend API v1: авторизация, команды, задачи.',
   'done', 'urgent',
   'a1000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '27 days',
   NOW() - INTERVAL '24 days',
   NOW() - INTERVAL '30 days', NOW());

-- Задача 4: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000004', 'b2000001-0000-0000-0000-000000000001',
   'Настройка PostgreSQL репликации', 'Master-slave репликация для production окружения.',
   'done', 'high',
   'a1000001-0000-0000-0000-000000000002',
   NOW() - INTERVAL '22 days',
   NOW() - INTERVAL '23 days',
   NOW() - INTERVAL '28 days', NOW());

-- Задача 5: CANCELLED
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000005', 'b2000001-0000-0000-0000-000000000001',
   'Интеграция с Jira', 'Синхронизация задач с корпоративной Jira через REST API.',
   'cancelled', 'low',
   'a1000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '20 days',
   NULL,
   NOW() - INTERVAL '29 days', NOW());

-- === SPRINT 2 (22-14 дней назад) ===

-- Задача 6: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000006', 'b2000001-0000-0000-0000-000000000001',
   'Реализация WebSocket уведомлений', 'Real-time уведомления через Gorilla WebSocket + Kafka.',
   'done', 'high',
   'a1000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '16 days',
   NOW() - INTERVAL '17 days',
   NOW() - INTERVAL '22 days', NOW());

-- Задача 7: DONE, просрочена
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000007', 'b2000001-0000-0000-0000-000000000001',
   'Верстка дашборда аналитики', 'Графики, метрики, тепловая карта активности.',
   'done', 'medium',
   'a1000001-0000-0000-0000-000000000003',
   NOW() - INTERVAL '17 days',
   NOW() - INTERVAL '14 days',
   NOW() - INTERVAL '22 days', NOW());

-- Задача 8: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000008', 'b2000001-0000-0000-0000-000000000001',
   'Unit тесты для Auth сервиса', 'Покрытие тестами > 80%: register, login, token refresh.',
   'done', 'medium',
   'a1000001-0000-0000-0000-000000000004',
   NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '16 days',
   NOW() - INTERVAL '21 days', NOW());

-- Задача 9: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000009', 'b2000001-0000-0000-0000-000000000001',
   'Оптимизация SQL запросов', 'EXPLAIN ANALYZE для топ-10 медленных запросов, добавить индексы.',
   'done', 'high',
   'a1000001-0000-0000-0000-000000000002',
   NOW() - INTERVAL '14 days',
   NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '20 days', NOW());

-- Задача 10: DONE, просрочена
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000010', 'b2000001-0000-0000-0000-000000000001',
   'Мобильная адаптация интерфейса', 'Responsive layout для экранов < 768px.',
   'done', 'urgent',
   'a1000001-0000-0000-0000-000000000003',
   NOW() - INTERVAL '17 days',
   NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '22 days', NOW());

-- Задача 11: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000011', 'b2000001-0000-0000-0000-000000000001',
   'Документация API (Swagger)', 'Описать все эндпоинты v1 в формате OpenAPI 3.0.',
   'done', 'low',
   'a1000001-0000-0000-0000-000000000005',
   NOW() - INTERVAL '14 days',
   NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '19 days', NOW());

-- === SPRINT 3 (14-7 дней назад) ===

-- Задача 12: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000012', 'b2000001-0000-0000-0000-000000000001',
   'Система ролей и разрешений', 'RBAC: owner/admin/member. Ограничения по действиям.',
   'done', 'urgent',
   'a1000001-0000-0000-0000-000000000001',
   NOW() - INTERVAL '9 days',
   NOW() - INTERVAL '10 days',
   NOW() - INTERVAL '14 days', NOW());

-- Задача 13: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000013', 'b2000001-0000-0000-0000-000000000001',
   'Загрузка файлов (S3 совместимость)', 'Прикрепление файлов к задачам и командам, drag & drop.',
   'done', 'high',
   'a1000001-0000-0000-0000-000000000002',
   NOW() - INTERVAL '8 days',
   NOW() - INTERVAL '9 days',
   NOW() - INTERVAL '14 days', NOW());

-- Задача 14: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000014', 'b2000001-0000-0000-0000-000000000001',
   'Рефакторинг компонента TaskList', 'Вынести логику в хуки, снизить связность компонентов.',
   'done', 'medium',
   'a1000001-0000-0000-0000-000000000003',
   NOW() - INTERVAL '8 days',
   NOW() - INTERVAL '8 days',
   NOW() - INTERVAL '13 days', NOW());

-- Задача 15: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000015', 'b2000001-0000-0000-0000-000000000001',
   'Канбан-доска с drag & drop', 'Перетаскивание карточек между колонками Todo/In Progress/Done.',
   'done', 'high',
   'a1000001-0000-0000-0000-000000000004',
   NOW() - INTERVAL '7 days',
   NOW() - INTERVAL '7 days',
   NOW() - INTERVAL '12 days', NOW());

-- Задача 16: DONE, просрочена
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000016', 'b2000001-0000-0000-0000-000000000001',
   'Интеграционные тесты API', 'Postman collection + Newman в CI для всех эндпоинтов.',
   'done', 'medium',
   'a1000001-0000-0000-0000-000000000005',
   NOW() - INTERVAL '9 days',
   NOW() - INTERVAL '7 days',
   NOW() - INTERVAL '13 days', NOW());

-- Задача 17: DONE, вовремя
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000017', 'b2000001-0000-0000-0000-000000000001',
   'Логирование и мониторинг', 'Structured logs (zap), метрики Prometheus, алерты.',
   'done', 'high',
   'a1000001-0000-0000-0000-000000000006',
   NOW() - INTERVAL '8 days',
   NOW() - INTERVAL '8 days',
   NOW() - INTERVAL '12 days', NOW());

-- === ТЕКУЩИЙ СПРИНТ (7 дней назад — сегодня) ===

-- Задача 18: IN_PROGRESS, не просрочена
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000018', 'b2000001-0000-0000-0000-000000000001',
   'Velocity Chart и тепловая карта', 'Новые блоки аналитики: GitHub-стиль heatmap + bar chart.',
   'in_progress', 'high',
   'a1000001-0000-0000-0000-000000000001',
   NOW() + INTERVAL '3 days',
   NULL,
   NOW() - INTERVAL '5 days', NOW());

-- Задача 19: IN_PROGRESS, просрочена (в опасности)
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000019', 'b2000001-0000-0000-0000-000000000001',
   'Настройка Nginx reverse proxy', 'SSL termination, gzip, rate limiting, upstream балансировка.',
   'in_progress', 'urgent',
   'a1000001-0000-0000-0000-000000000002',
   NOW() - INTERVAL '2 days',
   NULL,
   NOW() - INTERVAL '7 days', NOW());

-- Задача 20: IN_PROGRESS, срок сегодня
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000020', 'b2000001-0000-0000-0000-000000000001',
   'E2E тесты (Playwright)', 'Критические сценарии: login, create task, assign, complete.',
   'in_progress', 'high',
   'a1000001-0000-0000-0000-000000000003',
   NOW() + INTERVAL '1 day',
   NULL,
   NOW() - INTERVAL '6 days', NOW());

-- Задача 21: TODO, приоритет высокий
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000021', 'b2000001-0000-0000-0000-000000000001',
   'Dark mode для всего приложения', 'CSS переменные + переключатель темы, сохранение в localStorage.',
   'todo', 'medium',
   'a1000001-0000-0000-0000-000000000004',
   NOW() + INTERVAL '5 days',
   NULL,
   NOW() - INTERVAL '4 days', NOW());

-- Задача 22: TODO, urgent
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000022', 'b2000001-0000-0000-0000-000000000001',
   'Исправить race condition в WebSocket Hub', 'mutex при concurrent write в broadcast map.',
   'todo', 'urgent',
   'a1000001-0000-0000-0000-000000000001',
   NOW() + INTERVAL '2 days',
   NULL,
   NOW() - INTERVAL '3 days', NOW());

-- Задача 23: TODO, low
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000023', 'b2000001-0000-0000-0000-000000000001',
   'Экспорт задач в CSV/Excel', 'Кнопка экспорта в аналитике, выгрузка за выбранный период.',
   'todo', 'low',
   'a1000001-0000-0000-0000-000000000005',
   NOW() + INTERVAL '10 days',
   NULL,
   NOW() - INTERVAL '2 days', NOW());

-- Задача 24: TODO, medium, без дедлайна
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000024', 'b2000001-0000-0000-0000-000000000001',
   'Онбординг новых пользователей', 'Welcome modal с туром по функциям приложения.',
   'todo', 'medium',
   'a1000001-0000-0000-0000-000000000006',
   NULL,
   NULL,
   NOW() - INTERVAL '1 day', NOW());

-- Задача 25: IN_PROGRESS, просрочена
INSERT INTO tasks (id, team_id, title, description, status, priority, creator_id, due_date, completed_at, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000025', 'b2000001-0000-0000-0000-000000000001',
   'Оптимизация bundle size (< 500KB)', 'Tree shaking, code splitting, lazy loading роутов.',
   'in_progress', 'medium',
   'a1000001-0000-0000-0000-000000000003',
   NOW() - INTERVAL '1 day',
   NULL,
   NOW() - INTERVAL '6 days', NOW());

-- ── 5. НАЗНАЧЕНИЯ ЗАДАЧ (task_assignees) ─────────────────────

INSERT INTO task_assignees (id, task_id, user_id, role, assigned_at, assigned_by) VALUES
  -- Задача 1
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002', 'owner',    NOW()-INTERVAL '30 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004', 'assignee', NOW()-INTERVAL '30 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 2
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000003', 'owner',    NOW()-INTERVAL '30 days', 'a1000001-0000-0000-0000-000000000002'),
  -- Задача 3
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000001', 'owner',    NOW()-INTERVAL '30 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000005', 'assignee', NOW()-INTERVAL '30 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 4
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000002', 'owner',    NOW()-INTERVAL '28 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000006', 'assignee', NOW()-INTERVAL '28 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 5
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000006', 'owner',    NOW()-INTERVAL '29 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 6
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000001', 'owner',    NOW()-INTERVAL '22 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000004', 'assignee', NOW()-INTERVAL '22 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 7
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000003', 'owner',    NOW()-INTERVAL '22 days', 'a1000001-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000005', 'watcher',  NOW()-INTERVAL '22 days', 'a1000001-0000-0000-0000-000000000002'),
  -- Задача 8
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000004', 'owner',    NOW()-INTERVAL '21 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 9
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000002', 'owner',    NOW()-INTERVAL '20 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000006', 'assignee', NOW()-INTERVAL '20 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 10
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000003', 'owner',    NOW()-INTERVAL '22 days', 'a1000001-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000005', 'assignee', NOW()-INTERVAL '22 days', 'a1000001-0000-0000-0000-000000000002'),
  -- Задача 11
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'a1000001-0000-0000-0000-000000000005', 'owner',    NOW()-INTERVAL '19 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 12
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'a1000001-0000-0000-0000-000000000001', 'owner',    NOW()-INTERVAL '14 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'a1000001-0000-0000-0000-000000000002', 'assignee', NOW()-INTERVAL '14 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 13
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000013', 'a1000001-0000-0000-0000-000000000002', 'owner',    NOW()-INTERVAL '14 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000013', 'a1000001-0000-0000-0000-000000000004', 'assignee', NOW()-INTERVAL '14 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 14
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000014', 'a1000001-0000-0000-0000-000000000003', 'owner',    NOW()-INTERVAL '13 days', 'a1000001-0000-0000-0000-000000000002'),
  -- Задача 15
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000015', 'a1000001-0000-0000-0000-000000000004', 'owner',    NOW()-INTERVAL '12 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000015', 'a1000001-0000-0000-0000-000000000003', 'assignee', NOW()-INTERVAL '12 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 16
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000016', 'a1000001-0000-0000-0000-000000000005', 'owner',    NOW()-INTERVAL '13 days', 'a1000001-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000016', 'a1000001-0000-0000-0000-000000000006', 'assignee', NOW()-INTERVAL '13 days', 'a1000001-0000-0000-0000-000000000002'),
  -- Задача 17
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000017', 'a1000001-0000-0000-0000-000000000006', 'owner',    NOW()-INTERVAL '12 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 18
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000018', 'a1000001-0000-0000-0000-000000000001', 'owner',    NOW()-INTERVAL '5 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000018', 'a1000001-0000-0000-0000-000000000003', 'assignee', NOW()-INTERVAL '5 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 19
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000019', 'a1000001-0000-0000-0000-000000000002', 'owner',    NOW()-INTERVAL '7 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 20
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000020', 'a1000001-0000-0000-0000-000000000003', 'owner',    NOW()-INTERVAL '6 days', 'a1000001-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000020', 'a1000001-0000-0000-0000-000000000005', 'assignee', NOW()-INTERVAL '6 days', 'a1000001-0000-0000-0000-000000000002'),
  -- Задача 21
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000021', 'a1000001-0000-0000-0000-000000000004', 'owner',    NOW()-INTERVAL '4 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 22
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000022', 'a1000001-0000-0000-0000-000000000001', 'owner',    NOW()-INTERVAL '3 days', 'a1000001-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000022', 'a1000001-0000-0000-0000-000000000006', 'assignee', NOW()-INTERVAL '3 days', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 23
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000023', 'a1000001-0000-0000-0000-000000000005', 'owner',    NOW()-INTERVAL '2 days', 'a1000001-0000-0000-0000-000000000002'),
  -- Задача 24
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000024', 'a1000001-0000-0000-0000-000000000006', 'owner',    NOW()-INTERVAL '1 day', 'a1000001-0000-0000-0000-000000000001'),
  -- Задача 25
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000025', 'a1000001-0000-0000-0000-000000000003', 'owner',    NOW()-INTERVAL '6 days', 'a1000001-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000025', 'a1000001-0000-0000-0000-000000000004', 'assignee', NOW()-INTERVAL '6 days', 'a1000001-0000-0000-0000-000000000002')
ON CONFLICT (task_id, user_id) DO NOTHING;

-- ── 6. ЗАМЕТКИ КОМАНДЫ ───────────────────────────────────────
INSERT INTO notes (id, team_id, author_id, title, content, is_shared, created_at, updated_at) VALUES
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001',
   'Sprint 1 — итоги', 'Завершили CI/CD, дизайн и ТЗ. Задержка по ТЗ на 3 дня — нужно улучшить планирование.',
   true, NOW()-INTERVAL '22 days', NOW()-INTERVAL '22 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002',
   'Архитектура микросервисов', 'Рассмотрели переход на микросервисы. Решили остаться на монолите до v2.0.',
   true, NOW()-INTERVAL '20 days', NOW()-INTERVAL '20 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000003',
   'UI Kit компоненты', 'Финальный список компонентов: Button, Input, Modal, Toast, Badge, Card, Table.',
   true, NOW()-INTERVAL '15 days', NOW()-INTERVAL '15 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001',
   'Sprint 2 — ретроспектива', 'Хорошо: скорость доставки. Улучшить: code review процесс, нужны четкие критерии.',
   true, NOW()-INTERVAL '14 days', NOW()-INTERVAL '14 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000005',
   'Соглашение о коде', 'ESLint + Prettier конфиг зафиксирован. Go: golangci-lint с кастомными правилами.',
   true, NOW()-INTERVAL '10 days', NOW()-INTERVAL '10 days'),
  (gen_random_uuid(), 'b2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004',
   'Roadmap Q2 2026', 'Фичи: экспорт, dark mode, 2FA, мобильное приложение (React Native).',
   true, NOW()-INTERVAL '5 days', NOW()-INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- ── 7. КОММЕНТАРИИ К ЗАДАЧАМ ─────────────────────────────────
INSERT INTO comments (id, task_id, user_id, content, created_at, updated_at) VALUES
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000004',
   'Настроил деплой на staging, прогоняю тесты.', NOW()-INTERVAL '27 days', NOW()-INTERVAL '27 days'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000002',
   'Отлично, merge approved. Задача закрыта.', NOW()-INTERVAL '26 days', NOW()-INTERVAL '26 days'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000004',
   'Тестирую Gorilla WS, всё подключается стабильно.', NOW()-INTERVAL '18 days', NOW()-INTERVAL '18 days'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000019', 'a1000001-0000-0000-0000-000000000001',
   'Дедлайн уже прошёл, нужно срочно закончить конфигурацию!', NOW()-INTERVAL '1 day', NOW()-INTERVAL '1 day'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000019', 'a1000001-0000-0000-0000-000000000002',
   'Почти готово, осталось настроить SSL сертификаты.', NOW()-INTERVAL '12 hours', NOW()-INTERVAL '12 hours'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000022', 'a1000001-0000-0000-0000-000000000006',
   'Воспроизвел баг локально, смотрю в профайлер.', NOW()-INTERVAL '2 days', NOW()-INTERVAL '2 days'),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000018', 'a1000001-0000-0000-0000-000000000003',
   'Тепловую карту сделал, верстаю velocity chart.', NOW()-INTERVAL '3 days', NOW()-INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ── ИТОГ ─────────────────────────────────────────────────────
SELECT 'Users' AS entity, COUNT(*) FROM users WHERE id LIKE 'a1000001%'
UNION ALL SELECT 'Team', COUNT(*) FROM teams WHERE id = 'b2000001-0000-0000-0000-000000000001'
UNION ALL SELECT 'Members', COUNT(*) FROM team_members WHERE team_id = 'b2000001-0000-0000-0000-000000000001'
UNION ALL SELECT 'Tasks', COUNT(*) FROM tasks WHERE team_id = 'b2000001-0000-0000-0000-000000000001'
UNION ALL SELECT 'Assignees', COUNT(*) FROM task_assignees ta JOIN tasks t ON ta.task_id = t.id WHERE t.team_id = 'b2000001-0000-0000-0000-000000000001'
UNION ALL SELECT 'Notes', COUNT(*) FROM notes WHERE team_id = 'b2000001-0000-0000-0000-000000000001'
UNION ALL SELECT 'Comments', COUNT(*) FROM comments c JOIN tasks t ON c.task_id = t.id WHERE t.team_id = 'b2000001-0000-0000-0000-000000000001';
