# GitHub setup

## 1. Create repository
Create a new empty GitHub repository, e.g. `nutrition-app-v2`.

## 2. Push local code

```bash
git init
git add .
git commit -m "Initialize nutrition-app-v2"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/nutrition-app-v2.git
git push -u origin main
```

## 3. GitHub Actions secrets for SSH deploy

Add these repository secrets:
- `SSH_HOST`
- `SSH_USER`
- `SSH_PRIVATE_KEY`

## 4. Server-side expectations

Project path:
- `/opt/nutrition-app-v2`

Environment file:
- `/opt/nutrition-app-v2/.env`

Deploy command:

```bash
cd /opt/nutrition-app-v2/infra/docker
docker compose -f docker-compose.prod.yml up --build -d
```

## 5. Recommended next hardening
- use a deploy-only SSH key
- restrict SSH user permissions
- avoid storing secrets in repo
- pin real domain in `.env`
- replace example workflow with production-safe deploy logic
