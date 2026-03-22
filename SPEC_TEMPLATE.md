# Спецификация фичи: [НАЗВАНИЕ]

## Описание
[Что делает, для кого, зачем нужно]

## User Stories
- Как [роль], я хочу [действие], чтобы [результат]
- Как [роль], я хочу [действие], чтобы [результат]
- Как [роль], я хочу [действие], чтобы [результат]

## Модель данных
```sql
-- Новые таблицы или изменения существующих
table_name (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  field_name text NOT NULL,
  created_at timestamptz DEFAULT now()
)
```

## API
```
METHOD /api/v1/path                               [protected]
  Body: { field: type }
  201: { id, field, created_at }
  400: validation error
  403: not authorized
  404: not found
```

## Экраны и компоненты
- **[ComponentName]**: [что отображает, какие действия]
  - Состояние загрузки: [skeleton/spinner]
  - Состояние ошибки: [error message]
  - Состояние пусто: [empty state message]
  - Успех: [normal view]

## Бизнес-логика
- [Правило 1]
- [Правило 2]
- [Валидация]

## Уведомления
- [ ] Триггерит уведомление: [тип] при [событии]
- [ ] Получатели: [кто]
- [ ] Фильтр: [условие исключения]

## Крайние случаи
- [Сценарий 1] → [ожидаемое поведение]
- [Сценарий 2] → [ожидаемое поведение]

## i18n ключи (добавить в translations.ts)
```typescript
en: { key: 'English text' }
ru: { key: 'Русский текст' }
```

## Приоритет / Зависимости
- Приоритет: high | medium | low
- Зависит от: [модуль или миграция]
- Блокирует: [модуль]
