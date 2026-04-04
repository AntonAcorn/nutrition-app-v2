# Local development

## Requirements
- Docker + Docker Compose
- Node 22+
- Java 17+
- Maven 3.9+ (если запускать backend вне Docker)

## Option A: run everything with Docker Compose

```bash
cd infra/docker
cp ../../.env.example ../../.env
docker compose up --build
```

Services:
- frontend: http://localhost:5173
- backend: http://localhost:8080
- caddy: http://localhost
- postgres: localhost:5432

## Option B: mixed local dev

### Start only PostgreSQL in Docker

```bash
cd infra/docker
docker compose up -d postgres
```

### Run backend locally

```bash
cd backend
mvn spring-boot:run
```

Optional: auto-import the historical CSV on startup.

```bash
export NUTRITION_IMPORT_ENABLED=true
export NUTRITION_IMPORT_CSV_PATH=../docs/nutrition-history-sample.csv
mvn spring-boot:run
```

### Run frontend locally

```bash
cd frontend
npm install
npm run dev
```

## First checks

Backend health:

```bash
curl http://localhost:8080/api/health
```

## Daily metrics import

Backend exposes two paths for importing history:

1. **Startup import** via env vars:
   - `NUTRITION_IMPORT_ENABLED=true`
   - `NUTRITION_IMPORT_CSV_PATH=/absolute/or/relative/path/to/file.csv`
2. **Manual API trigger**:

```bash
curl -X POST http://localhost:8080/api/imports/daily-metrics \
  -H 'Content-Type: application/json' \
  -d '{"csvPath":"/absolute/path/to/nutrition-history.csv"}'
```

The importer understands Russian headers and decimal commas.

## Notes
- Current setup is starter-level and intentionally minimal
- Analyzer service is still a placeholder
- Old nutrition-dashboard remains untouched
