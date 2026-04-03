# Live runbook

Короткая инструкция для первой live-итерации `nutrition-app-v2`.

## Цель

Поднять минимальный production frontend на сервере и открыть его по live URL, не трогая старый `nutrition-dashboard`.

## Что входит в первую итерацию

- production build frontend
- frontend раздаётся как статический сайт из контейнера
- Caddy проксирует `/api/*` на backend и остальное на frontend
- backend отвечает как минимум на `/api/health`
- стек поднимается отдельно от старого проекта

## Предпосылки

На сервере должны быть:
- Docker
- Docker Compose plugin (`docker compose`)
- открытые порты 80/443
- домен или временный публичный адрес

## Проектовый путь на сервере

Рекомендуемый путь:
- `/opt/nutrition-app-v2`

## Env

Создать файл:
- `/opt/nutrition-app-v2/.env`

Минимальный стартовый пример:

```env
POSTGRES_DB=nutrition_app
POSTGRES_USER=nutrition
POSTGRES_PASSWORD=change-me-now
APP_DOMAIN=example.com
```

Если используется временный домен/поддомен — подставить его в `APP_DOMAIN`.
Если live DNS ещё не готов, допустим временный IP/host для bootstrap; главное, чтобы `APP_DOMAIN` не оставался пустым.

## Первый деплой

### Вариант A — рекомендуемый: через GitHub Actions после merge в `main`

1. На сервере заранее подготовить `/opt/nutrition-app-v2/.env`
2. В GitHub repository secrets добавить `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`
3. При необходимости добавить `SSH_PORT` и `SSH_KNOWN_HOSTS`
4. Смёржить PR в `main` — workflow `Deploy to production over SSH` сам синхронизирует код и выполнит deploy

### Вариант B — ручной bootstrap прямо на сервере

```bash
cd /opt/nutrition-app-v2
cp .env.example .env   # если .env ещё не создан
# затем вручную поправить значения

docker compose -f infra/docker/docker-compose.prod.yml up -d --build
```

После первого успешного bootstrap дальше лучше использовать GitHub Actions, а не ручной `scp`/`git pull`.

## Проверка после деплоя

### 1. Статус контейнеров

```bash
docker compose -f infra/docker/docker-compose.prod.yml ps
```

Ожидаемо должны быть подняты:
- `postgres`
- `backend`
- `frontend`
- `caddy`

### 2. Проверка compose-конфига

```bash
docker compose -f infra/docker/docker-compose.prod.yml config
```

Это полезно прогонять ещё до первого запуска.

### 3. Логи

```bash
docker compose -f infra/docker/docker-compose.prod.yml logs --tail=100
```

### 4. Backend health

GitHub Actions workflow после deploy уже делает smoke check локально на сервере через Caddy:

```bash
curl -H "Host: $APP_DOMAIN" http://127.0.0.1/api/health
```

Для внешней ручной проверки, если домен уже смотрит на сервер:

```bash
curl https://$APP_DOMAIN/api/health
```

Ожидаемый ответ:

```json
{"status":"ok","service":"nutrition-backend"}
```

### 5. Frontend smoke check

Открыть в браузере:

- `https://$APP_DOMAIN`

Ожидаемый результат:
- открывается стартовый экран `Nutrition App v2`
- виден базовый day view shell
- нет 502/404 на первом экране
- `/api/health` отвечает успешно

## Если что-то сломалось

### Проверить backend

```bash
docker compose -f infra/docker/docker-compose.prod.yml logs backend --tail=100
```

### Проверить frontend

```bash
docker compose -f infra/docker/docker-compose.prod.yml logs frontend --tail=100
```

### Проверить caddy

```bash
docker compose -f infra/docker/docker-compose.prod.yml logs caddy --tail=100
```

### Проверить, что домен реально совпадает с `APP_DOMAIN`

Если в `Caddyfile.production` указан `{$APP_DOMAIN:localhost}`, а DNS смотрит не туда или домен не совпадает, Caddy не сможет корректно обслуживать live URL.
Отсутствующий или пустой `APP_DOMAIN` больше не ломает парсинг Caddyfile/compose: контейнер получит fallback `localhost`. Но deploy всё равно будет в некорректном состоянии: Caddy матчится на `localhost`, а smoke/external checks будут бесполезны, пока не задан реальный host.

## Базовый recovery

### Повторить deploy через GitHub Actions

Предпочтительный путь:
- открыть workflow `Deploy to production over SSH`
- запустить `Run workflow` вручную (`workflow_dispatch`)

Это удобно, если:
- merge уже был, но deploy нужно повторить
- на сервере исправили окружение и нужен повторный rollout
- нужно быстро переподнять тот же revision без нового коммита

### Ручной recovery на сервере

Пересобрать и перезапустить:

```bash
docker compose -f infra/docker/docker-compose.prod.yml up -d --build
```

Остановить стек:

```bash
docker compose -f infra/docker/docker-compose.prod.yml down
```

## Граница этой итерации

В первой итерации цель — живой минимальный frontend с рабочим reverse proxy и health endpoint.

Полноценные backend-экраны, auth, загрузка фото и analyzer pipeline — следующие шаги.
