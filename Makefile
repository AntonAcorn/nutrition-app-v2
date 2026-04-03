PROJECT_NAME=nutrition-app-v2
COMPOSE_DIR=infra/docker
PROD_COMPOSE_FILE=$(COMPOSE_DIR)/docker-compose.prod.yml
PROD_ENV_FILE?=.env

up:
	cd $(COMPOSE_DIR) && docker compose up --build

down:
	cd $(COMPOSE_DIR) && docker compose down

prod-config:
	docker compose --env-file $(PROD_ENV_FILE) -f $(PROD_COMPOSE_FILE) config

prod-up:
	docker compose --env-file $(PROD_ENV_FILE) -f $(PROD_COMPOSE_FILE) up --build -d

prod-down:
	docker compose --env-file $(PROD_ENV_FILE) -f $(PROD_COMPOSE_FILE) down

logs:
	cd $(COMPOSE_DIR) && docker compose logs -f

backend-run:
	cd backend && mvn spring-boot:run

frontend-run:
	cd frontend && npm install && npm run dev
