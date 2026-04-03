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

Минимальный стартовый пример для нормального домена/TLS:

```env
POSTGRES_DB=nutrition_app
POSTGRES_USER=nutrition
POSTGRES_PASSWORD=change-me-now
APP_DOMAIN=example.com
CADDY_SITE_ADDRESS=example.com
```

Bootstrap-вариант без домена, когда приложение нужно открыть с другой машины по IP через plain HTTP:

```env
POSTGRES_DB=nutrition_app
POSTGRES_USER=nutrition
POSTGRES_PASSWORD=change-me-now
APP_DOMAIN=65.109.3.45
CADDY_SITE_ADDRESS=http://65.109.3.45
```

Правило такое:
- `APP_DOMAIN` — host/IP для smoke checks и явного значения хоста
- `CADDY_SITE_ADDRESS` — реальный Caddy site label
- если нужен временный bootstrap без TLS, `CADDY_SITE_ADDRESS` должен начинаться с `http://`
- если уже есть нормальный домен и нужен стандартный production path с TLS, использовать обычный host без схемы

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

Для внешней ручной проверки, если используется bootstrap по IP/HTTP:

```bash
curl http://$APP_DOMAIN/api/health
```

Если уже используется нормальный домен с TLS:

```bash
curl https://$APP_DOMAIN/api/health
```

Ожидаемый ответ:

```json
{"status":"ok","service":"nutrition-backend"}
```

### 5. Frontend smoke check

Открыть в браузере:

- bootstrap по IP/HTTP: `http://$APP_DOMAIN`
- нормальный домен/TLS: `https://$APP_DOMAIN`

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

### Проверить, что `APP_DOMAIN` и `CADDY_SITE_ADDRESS` согласованы

Если для bootstrap по IP нужен plain HTTP, а `CADDY_SITE_ADDRESS` оставлен как просто `65.109.3.45` без `http://`, Caddy воспримет это как HTTPS-адрес и начнёт auto-HTTPS/redirect поведение.

Если уже есть реальный домен и нужен штатный production path, наоборот нужно использовать обычный host без схемы:
- `APP_DOMAIN=nutrition.example.com`
- `CADDY_SITE_ADDRESS=nutrition.example.com`

Отсутствующие или пустые переменные теперь не ломают парсинг Caddyfile/compose: Caddy получит fallback `localhost`. Но это только safe fallback для валидации, а не корректная live-конфигурация.

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
