# Nutrition history foundation

## Storage choice
- **Database:** PostgreSQL (already part of the stack)
- **Reasoning:**
  - Native JSONB + numeric support for both analyzer drafts and precise nutrition metrics
  - Mature Flyway integration already installed in the backend
  - Easy to run locally via existing Docker Compose services and to host in production (single dependency)
  - Strong tooling for analytics queries (CTEs, window functions) that will be needed for weekly/monthly rollups

## Daily nutrition entry schema
- `daily_nutrition_entries` is now the daily source of truth (one row per user + date)
- Uniqueness is enforced at the database level (`user_id + entry_date`)
- Required inputs per row: `entry_date`, `calories_consumed_kcal`, other nutrition values remain nullable to accept partial days/import gaps
- Timestamp columns are managed via database defaults plus entity listeners so every change stays auditable

### Source-of-truth fields
| Field | Notes |
| --- | --- |
| `entry_date` | Calendar day the numbers belong to (UTC). |
| `weight_kg` | Optional but persisted exactly as entered/imported. |
| `calories_consumed_kcal` | Mandatory daily total from confirmed meals. |
| `calorie_target_kcal` | Optional because historical imports may lack a target. |
| `protein_g` / `fiber_g` | Optional but stored verbatim to keep parity with the spreadsheet. |
| `notes` | Free-form annotations (e.g., “travel day”, “estimate from watch”). |

### Derived fields (computed, not stored)
- `calorie_balance_kcal = calorie_target_kcal - calories_consumed_kcal`
- Weekly/monthly aggregates and moving averages
- Completion percentages for protein/fiber targets
- Any “streaks” or “consistency badges”

Keeping derived values ephemeral ensures that imports, corrections, and analyzer replays never fall out of sync with cached totals.

## Migration/bootstrap
- Flyway migration `V2__daily_nutrition_history.sql` creates the new table + covering index on `(user_id, entry_date)`
- Backend now contains JPA entities, repository accessors, and a `NutritionHistoryService` with an explicit `upsert` command to prepare for the upcoming CSV import step
- Weekly/monthly aggregate endpoints can be layered on top of the service without further schema work
