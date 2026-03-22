# Task Manager — ВКР Корпоративное приложение

## Обзор
Корпоративный таск-менеджер с командами, задачами, real-time уведомлениями и аналитикой.
Проект: ВКР (дипломная работа). Работать аккуратно, без сломов существующей логики.

## Стек
- **Backend**: Go 1.25 + Gin + sqlx + gorilla/websocket + sarama (Kafka) + golang-jwt
- **Frontend**: React 19 + TypeScript + Zustand 5 + Axios + Tailwind CSS 4 + Vite 7
- **DB**: PostgreSQL 16 (10 миграций, 001–010)
- **Cache**: Redis 7
- **Queue**: Kafka 7.5.0 (topic: notifications)
- **Auth**: JWT HS256, 24ч, Bearer token
- **Deploy**: Docker Compose (postgres:5432, redis:6379, kafka:9092, kafka-ui:8090)

## Архитектура
```
Frontend (React :5173) → proxy → Backend (Gin :8080) → PostgreSQL/Redis/Kafka
                                      ↕ WebSocket /ws?user_id={UUID}
```
**Паттерн**: Handler → Service → Repository (Clean Architecture)
**API prefix**: `/api/v1`
**CORS**: AllowAllOrigins (dev)

## Структура проекта
```
backend/
  cmd/api/main.go           # Entry point
  internal/
    handlers/               # 10 handlers (auth, task, team, comment, note, attachment, label, search, time_entry, websocket)
    services/               # 10 services (+ notification_service.go — КЛЮЧЕВОЙ)
    repository/postgres/    # 10 repos (sqlx)
    models/                 # data structs
    middleware/auth.go      # JWT validation
    websocket/hub.go        # WebSocket Hub
    scheduler/deadline_checker.go  # фоновая проверка дедлайнов (каждую минуту)
  migrations/               # 001–010 SQL
  pkg/utils/                # database, redis, kafka, jwt, password
frontend/
  src/
    pages/                  # Login, Register, Dashboard, Team (69KB), TaskDetail (46KB)
    components/             # 16 компонентов
    store/store.ts          # Zustand global state
    services/api.ts         # все API endpoints (Axios)
    i18n/translations.ts    # en/ru
```

## Правила разработки
- НИКОГДА не ломай существующую систему уведомлений (notification_service.go + hub.go)
- НИКОГДА не меняй схему JWT без обновления middleware/auth.go
- Новые таблицы — только через миграции (нумерация 011+)
- Типы полей БД: uuid, text, boolean, timestamptz, integer, jsonb
- Все защищённые routes через AuthMiddleware (userID из context)
- Frontend state — только через Zustand store, не локальный useState для глобальных данных
- UI: dark theme first, Tailwind CSS 4, паттерны из memory (pill badges, inline edit)
- i18n: все новые строки добавлять в translations.ts (en + ru)

## Ключевые команды
```bash
# Backend
cd backend && go run cmd/api/main.go          # запуск (порт 8080)
go run scripts/migrate.go                     # миграции
go build -o api ./cmd/api                     # сборка

# Frontend
cd frontend && npm run dev                    # Vite dev server (порт 5173)
npm run build                                  # production build

# Infrastructure
docker-compose up -d                          # postgres, redis, kafka, kafka-ui
```

## Уведомления (критическая система)
Типы: task_assigned, task_status_changed, new_comment, task_deleted, deadline_alert
Поток: Handler → NotificationService → WebSocket Hub → Client
Фильтр: не отправлять уведомление автору действия (actionAuthorID != recipientID)
