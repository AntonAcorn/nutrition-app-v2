# Nutrition App v2 — Architecture

## Core idea

Source of truth = PostgreSQL.

Google Sheets bridge is temporary and should not remain the primary persistence layer.

## Main components

### Frontend
- React + Vite
- Upload photo
- Show draft analysis
- Let user confirm/edit
- Show meals/day totals/history

### Backend
- Spring Boot
- REST API
- Stores uploads metadata
- Creates analysis requests
- Persists confirmed meal entries
- Exposes day/meal/history endpoints

### Database
- PostgreSQL
- Main business entities live here
- Totals derived cleanly from records

### Analyzer
- Separate async service/worker
- Reads pending `analysis_requests`
- Produces draft structured output
- Never finalizes truth directly

### Reverse proxy
- Caddy
- Routes frontend/backend
- TLS in production

## High-level flow

1. User uploads photo
2. Backend saves file + creates upload record
3. Backend creates `analysis_request(status=PENDING)`
4. Analyzer picks it up and produces draft
5. Backend stores draft result
6. Frontend displays draft for review
7. User confirms/edits
8. Backend creates confirmed meal record

## Initial domain model

- `users`
- `days`
- `meal_entries`
- `meal_photos`
- `analysis_requests`
- `analysis_drafts`
- `audit_log` (optional but recommended)

## Design notes

- Photo analysis is advisory, not authoritative
- Confirmed meals should be explicitly distinguishable from drafts
- Keep uploads and DB state decoupled from deployment container lifecycle via volumes
