# Local development

## Requirements
- Docker + Docker Compose
- Node 22+
- Java 21+
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

## Notes
- Current setup is starter-level and intentionally minimal
- Analyzer service is still a placeholder
- Old nutrition-dashboard remains untouched
