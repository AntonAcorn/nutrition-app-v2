# API Draft

## Health
- GET /api/health

## Days
- GET /api/days/{date}
- POST /api/days/{date}/meals
- GET /api/days/{date}/totals

## Uploads / analysis
- POST /api/uploads/photo
- POST /api/analysis-requests
- GET /api/analysis-requests/{id}
- POST /api/analysis-requests/{id}/confirm
- POST /api/analysis-requests/{id}/reject

## Meals
- GET /api/meals/{id}
- PATCH /api/meals/{id}
- DELETE /api/meals/{id}

## Notes
- Confirm endpoint should create/update confirmed meal entry from reviewed draft payload
- Reject endpoint should preserve history but not create a meal entry
