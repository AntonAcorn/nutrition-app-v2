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

## Первая итерация

Цель первой итерации — поднять минимальный live frontend на сервере:
- frontend собирается production-сборкой
- frontend раздаётся как статический сайт из контейнера
- Caddy проксирует `/api/*` на backend и остальное на frontend
- деплой идёт через `infra/docker/docker-compose.prod.yml`

## Bootstrap по IP vs нормальный домен

Для live bootstrap без домена используем plain HTTP:
- `APP_DOMAIN=65.109.3.45`
- `CADDY_SITE_ADDRESS=http://65.109.3.45`

Для нормального production-домена оставляем обычный host, чтобы Caddy вёл себя как TLS entrypoint:
- `APP_DOMAIN=nutrition.example.com`
- `CADDY_SITE_ADDRESS=nutrition.example.com`

Идея простая:
- `APP_DOMAIN` остаётся значением host/IP для smoke checks и документации
- `CADDY_SITE_ADDRESS` управляет тем, как именно Caddy открывает сайт
- префикс `http://` нужен только для временного bootstrap по IP/host без TLS

## Важный нюанс production compose

Для `docker compose` interpolation вида `${APP_DOMAIN}` и `${CADDY_SITE_ADDRESS}` недостаточно только `env_file:` внутри сервиса: `env_file` попадает в environment контейнера, но не управляет тем, чем compose подставляет значения в сам YAML.

Поэтому production-запуск должен явно указывать env-файл верхнего уровня:

```bash
docker compose --env-file .env -f infra/docker/docker-compose.prod.yml config
docker compose --env-file .env -f infra/docker/docker-compose.prod.yml up -d --build
```

На сервере source of truth остаётся `/opt/nutrition-app-v2/.env`; GitHub Actions deploy использует именно его через `--env-file`.
