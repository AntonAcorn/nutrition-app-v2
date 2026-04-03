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
  - `docker compose --env-file .env -f infra/docker/docker-compose.prod.yml config` валиден

## 3. GitHub Actions baseline

Сейчас production baseline такой:
- `ci.yml` — backend build + frontend build, остаётся обязательным для PR
- `deploy-ssh.yml` — реальный production deploy workflow по SSH

Логика запуска deploy:
- автоматически на `push` в `main`
- вручную через `workflow_dispatch` для повторного rollout / hotfix-перезапуска без нового коммита

Почему именно так:
- PR остаётся основным gate: изменения сначала проходят review и CI
- deploy не идёт на feature-ветки и не ломает модель `PR -> merge -> deploy`
- ручной trigger полезен для повторного прогона после серверной правки, flaky deploy или rollback/forward без изменения workflow

Что делает `deploy-ssh.yml`:
1. проверяет наличие обязательных GitHub secrets
2. поднимает SSH agent и known_hosts
3. синхронизирует репозиторий на сервер в `/opt/nutrition-app-v2`
4. запускает `docker compose --env-file /opt/nutrition-app-v2/.env -f infra/docker/docker-compose.prod.yml up -d --build`
5. делает smoke check через `http://127.0.0.1/api/health` с `Host: $APP_DOMAIN`

Важно:
- workflow не хранит production secrets в репозитории
- серверный `.env` остаётся только на сервере и не перезаписывается из GitHub Actions
- `storage/` и `.env` исключены из sync, чтобы не затереть runtime state
- production compose вызывается с явным `--env-file`, потому что `env_file:` в сервисах не участвует в compose interpolation `${...}`

## 4. GitHub Actions secrets for SSH deploy

Добавить repository secrets:
- `SSH_HOST`
- `SSH_USER`
- `SSH_PRIVATE_KEY`

Поддерживаемые опциональные secrets:
- `SSH_PORT` — если SSH не на `22`
- `SSH_KNOWN_HOSTS` — предпочтительный pinned host key; если не задан, workflow делает `ssh-keyscan` во время запуска

Не нужно класть в GitHub secrets production `.env`, если сервер уже хранит runtime-конфиг локально.
`APP_DOMAIN` должен жить в `/opt/nutrition-app-v2/.env` на сервере, потому что он нужен для post-deploy smoke check.
`CADDY_SITE_ADDRESS` тоже должен жить там же, потому что именно он задаёт Caddy site label:
- для bootstrap по IP/HTTP: `CADDY_SITE_ADDRESS=http://65.109.3.45`
- для нормального домена/TLS: `CADDY_SITE_ADDRESS=nutrition.example.com`

Если переменные отсутствуют или пусты, compose теперь подставит `localhost`, а production Caddyfile имеет такой же fallback для прямой валидации. Это нужно только для того, чтобы Caddy не падал на этапе парсинга; корректным live значением это не считается.

## 5. Server-side expectations

Project path:
- `/opt/nutrition-app-v2`

Environment file:
- `/opt/nutrition-app-v2/.env`

Минимум должно быть готово заранее:
- у SSH user есть доступ к `/opt/nutrition-app-v2`
- у SSH user есть право запускать `docker compose` без интерактивного sudo
- на сервере установлен Docker + Compose plugin
- в `/opt/nutrition-app-v2/.env` есть рабочие `APP_DOMAIN` и `CADDY_SITE_ADDRESS`
- для IP bootstrap `CADDY_SITE_ADDRESS` должен быть со схемой `http://...`, иначе Caddy снова включит auto-HTTPS-поведение

Deploy command, который выполняет workflow:

```bash
cd /opt/nutrition-app-v2
docker compose --env-file /opt/nutrition-app-v2/.env -f infra/docker/docker-compose.prod.yml config
docker compose --env-file /opt/nutrition-app-v2/.env -f infra/docker/docker-compose.prod.yml up -d --build
```

## 6. Recommended hardening

- использовать отдельный deploy-only SSH key
- ограничить SSH user по доступам и командам настолько, насколько позволяет ваш setup
- хранить pinned host key в `SSH_KNOWN_HOSTS`, а не полагаться только на `ssh-keyscan`
- не хранить production secrets в repo
- держать production `.env` только на сервере
- по возможности защитить GitHub environment `production` reviewers / branch rules
- при необходимости добавить отдельный rollback workflow, но не смешивать его с обычным deploy
