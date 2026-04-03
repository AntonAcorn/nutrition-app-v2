# Live runbook

Короткая инструкция для первой live-итерации `nutrition-app-v2`.

## Цель

Поднять минимальный production frontend на сервере и открыть его по live URL.

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

## Деплой

```bash
cd /opt/nutrition-app-v2
cp .env.example .env   # если .env ещё не создан
# затем вручную поправить значения

docker compose -f infra/docker/docker-compose.prod.yml up -d --build
```

## Проверка после деплоя

### Статус контейнеров

```bash
docker compose -f infra/docker/docker-compose.prod.yml ps
```

### Логи

```bash
docker compose -f infra/docker/docker-compose.prod.yml logs --tail=100
```

### Backend health

Если домен уже смотрит на сервер:

```bash
curl https://$APP_DOMAIN/api/health
```

Если TLS/домен ещё не готовы, можно проверять локально на сервере через Caddy/backend route по фактической схеме.

### Frontend smoke check

Открыть в браузере:

- `https://$APP_DOMAIN`

Ожидаемый результат:
- открывается стартовая страница `Nutrition App v2`
- нет 502/404 на первом экране
- `/api/health` отвечает успешно

## Если что-то сломалось

### Проверить compose-конфиг

```bash
docker compose -f infra/docker/docker-compose.prod.yml config
```

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

## Базовый recovery

Пересобрать и перезапустить:

```bash
docker compose -f infra/docker/docker-compose.prod.yml up -d --build
```

Остановить стек:

```bash
docker compose -f infra/docker/docker-compose.prod.yml down
```

## Замечание

В первой итерации цель — живой минимальный frontend. Полноценная backend-логика, auth и analyzer pipeline идут следующими шагами.
