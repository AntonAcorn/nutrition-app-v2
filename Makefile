PROJECT_NAME=nutrition-app-v2
COMPOSE_DIR=infra/docker

up:
	cd $(COMPOSE_DIR) && docker compose up --build

down:
	cd $(COMPOSE_DIR) && docker compose down

prod-up:
	cd $(COMPOSE_DIR) && docker compose -f docker-compose.prod.yml up --build -d

prod-down:
	cd $(COMPOSE_DIR) && docker compose -f docker-compose.prod.yml down

logs:
	cd $(COMPOSE_DIR) && docker compose logs -f

backend-run:
	cd backend && mvn spring-boot:run

frontend-run:
	cd frontend && npm install && npm run dev
