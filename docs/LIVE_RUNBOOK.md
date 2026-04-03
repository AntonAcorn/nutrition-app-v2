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

## Первый деплой

```bash
cd /opt/nutrition-app-v2
cp .env.example .env   # если .env ещё не создан
# затем вручную поправить значения

docker compose -f infra/docker/docker-compose.prod.yml up -d --build
```

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

Если домен уже смотрит на сервер:

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

Если в `Caddyfile.production` указан `{$APP_DOMAIN}`, а DNS смотрит не туда или домен не совпадает, Caddy не сможет корректно обслуживать live URL.

## Базовый recovery

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
