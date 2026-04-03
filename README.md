# Nutrition App v2

Отдельный новый проект для nutrition app.

## Цель

Собрать полноценное приложение с:
- Frontend: React/Vite
- Backend: Spring Boot
- DB: PostgreSQL
- Analyzer: отдельный async worker/service
- Reverse proxy: Caddy
- Deploy: Docker Compose + GitHub Actions

## Архитектурный принцип

Analyzer не является источником истины.

Flow:
1. пользователь загружает фото
2. backend сохраняет файл
3. создаётся `analysis_request`
4. analyzer создаёт draft
5. frontend показывает draft
6. после подтверждения создаётся настоящая `meal_entry`

## Структура

- `backend/` — Spring Boot API
- `frontend/` — React/Vite UI
- `analyzer/` — async analyzer worker/service
- `infra/` — docker/caddy/deploy configs
- `docs/` — архитектура, schema, migration plan
- `.github/workflows/` — CI/CD
- `storage/` — локальные runtime-volume каталоги

## Статус

Это новый отдельный проект. Текущий серверный инстанс старого nutrition-dashboard не трогаем.
