# Nutrition history CSV seed verification

## Source
Imported from:
- `Nutrition_log_2026_-_Лист1_1---ae1cca53-1cb6-47ca-8acd-aa8b28c82f3a.csv`

The Flyway seed writes into the current source-of-truth table:
- `daily_nutrition_entries`

Seed user created/used by the migration:
- `user_id = 11111111-1111-1111-1111-111111111111`
- `external_ref = anton-nutrition-history`

Only these source-of-truth columns were mapped from the CSV:
- `Дата` -> `entry_date`
- `Вес` -> `weight_kg`
- `Съедено за день` -> `calories_consumed_kcal`
- `Норма` -> `calorie_target_kcal`
- `Белок` -> `protein_g`
- `Клетчатка` -> `fiber_g`

These derived spreadsheet fields were intentionally **not** imported:
- `Отклонение`
- `Неделя`
- `Средний вес недели`
- `Итог недели по калориям`
- `Месяц`
- `Итог месяца по калориям`

## Verification commands
From a clean database, run Flyway via backend startup and then verify with SQL:

```sql
select count(*)
from daily_nutrition_entries
where user_id = '11111111-1111-1111-1111-111111111111'::uuid;

select min(entry_date), max(entry_date)
from daily_nutrition_entries
where user_id = '11111111-1111-1111-1111-111111111111'::uuid;

select entry_date, weight_kg, calories_consumed_kcal, calorie_target_kcal, protein_g, fiber_g
from daily_nutrition_entries
where user_id = '11111111-1111-1111-1111-111111111111'::uuid
order by entry_date;
```

Expected results for this seed:
- row count: `20`
- date range: `2026-03-19` .. `2026-04-07`

## Decimal comma handling
The seed keeps the CSV weight literals and converts them in SQL with:

```sql
replace('<value with comma>', ',', '.')::numeric(...)
```

Example:
- CSV `74,15` -> DB `74.15`

## Local verification notes
- `mvn test` is the lightweight repo-level verification available from this task context.
- A disposable Postgres + Flyway smoke-check was prepared, but could not be executed from this session because Docker socket access is unavailable in the current runtime.
