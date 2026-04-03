# GitHub setup

## 1. Repository

Рабочий репозиторий:
- `AntonAcorn/nutrition-app-v2`

Если проект клонируется заново:

```bash
git clone git@github.com:AntonAcorn/nutrition-app-v2.git
cd nutrition-app-v2
```

## 2. Main branch policy

Рекомендуемая схема для первой live-итерации:
- работа идёт через PR
- `main` остаётся deploy-веткой
- merge в `main` допускается только когда:
  - CI зелёный
  - `frontend` production build проходит
  - `docker compose -f infra/docker/docker-compose.prod.yml config` валиден

## 3. GitHub Actions baseline

Сейчас в проекте есть:
- `ci.yml` — backend build + frontend build
- `deploy-example.yml` — placeholder
- `deploy-ssh-example.yml` — пример SSH deploy

Для безопасного первого production rollout достаточно:
- оставить `ci.yml` обязательным
- использовать SSH deploy workflow как шаблон
- не включать auto-deploy на каждый push, пока не будет подтверждён серверный target

## 4. GitHub Actions secrets for SSH deploy

Добавить repository secrets:
- `SSH_HOST`
- `SSH_USER`
- `SSH_PRIVATE_KEY`

Опционально позже:
- `SSH_PORT`
- `APP_DOMAIN`
- другие runtime secrets, если решим передавать env не только через серверный `.env`

## 5. Server-side expectations

Project path:
- `/opt/nutrition-app-v2`

Environment file:
- `/opt/nutrition-app-v2/.env`

Deploy command:

```bash
cd /opt/nutrition-app-v2/infra/docker
docker compose -f docker-compose.prod.yml up --build -d
```

## 6. Recommended hardening before regular deploys

- использовать отдельный deploy-only SSH key
- ограничить SSH user по доступам
- не хранить production secrets в repo
- держать production `.env` только на сервере
- добавить smoke-check после деплоя (`/api/health` + открытие frontend)
- позже перевести example workflow в production-safe deploy pipeline
