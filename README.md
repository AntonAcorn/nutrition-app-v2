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

## One-time CSV import в daily_nutrition_entries

В backend добавлен одноразовый импорт historical nutrition CSV в `daily_nutrition_entries`.

Поддерживается:
- русские и английские заголовки (`Дата`, `Калории`, `Норма`, `Вес`, `Белок`, `Клетчатка`, `Заметки` и EN aliases)
- десятичные значения с запятой (`74,15`) и разделителями тысяч (`1 234,56`)
- upsert по `(user_id, entry_date)`
- сохраняются только source-of-truth поля (без derived агрегатов)

Пример dry-run:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.main.web-application-type=none --nutrition.import.csv.enabled=true --nutrition.import.csv.dry-run=true --nutrition.import.csv.path=/absolute/path/nutrition.csv --nutrition.import.csv.user-id=<USER_UUID>"
```

Реальный импорт (запись в DB):

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.main.web-application-type=none --nutrition.import.csv.enabled=true --nutrition.import.csv.path=/absolute/path/nutrition.csv --nutrition.import.csv.user-id=<USER_UUID>"
```

Проверка результата (пример):

```sql
select entry_date, calories_consumed_kcal, weight_kg, protein_g, fiber_g
from daily_nutrition_entries
where user_id = '<USER_UUID>'::uuid
order by entry_date;
```

## Photo analysis backend skeleton (v1)

В backend добавлен PR-sized skeleton для анализа фото еды.

### Endpoint

- `POST /api/photo-analysis`

### Example request

```json
{
  "imageUrl": "https://cdn.example.com/meals/lunch.jpg",
  "userNote": "Chicken, rice, maybe cucumbers",
  "locale": "en"
}
```

### Example response

```json
{
  "items": [
    {
      "name": "Chicken breast",
      "estimatedPortion": "150 g",
      "calories": 248,
      "protein": 46,
      "carbs": 0,
      "fat": 5,
      "fiber": 0,
      "confidence": 0.81
    }
  ],
  "totals": {
    "calories": 248,
    "protein": 46,
    "carbs": 0,
    "fat": 5,
    "fiber": 0
  },
  "confidence": 0.81,
  "notes": [
    "Stub response from provider 'openai-stub'.",
    "Replace StubOpenAiPhotoAnalysisProvider with a real OpenAI API client once OPENAI_API_KEY is available.",
    "User confirmation remains required before creating a meal entry."
  ],
  "needsUserConfirmation": true
}
```

### Current behavior

- текущая реализация использует `StubOpenAiPhotoAnalysisProvider`
- live вызов OpenAI пока не обязателен и не используется
- ответ уже имеет app-oriented форму для draft/confirmation flow

### Future OpenAI wiring

Переменные окружения уже заведены:

- `PHOTO_ANALYSIS_ENABLED`
- `PHOTO_ANALYSIS_PROVIDER`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`

Чтобы подключить реальный OpenAI later:
1. оставить endpoint и service boundary как есть
2. заменить `StubOpenAiPhotoAnalysisProvider` на HTTP/OpenAI client implementation
3. читать ключ из `OPENAI_API_KEY`, модель из `OPENAI_MODEL`, base URL из `OPENAI_BASE_URL`
4. при необходимости переключать provider через `PHOTO_ANALYSIS_PROVIDER`

### Backend test run

```bash
cd backend
mvn test
```
