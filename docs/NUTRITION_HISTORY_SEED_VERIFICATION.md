# Nutrition history CSV seed verification

## Source
Imported from:
- `Nutrition_log_2026_-_Лист1_1---ae1cca53-1cb6-47ca-8acd-aa8b28c82f3a.csv`

Only these source-of-truth columns were mapped into `nutrition_history`:
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
select count(*) from nutrition_history;
select min(entry_date), max(entry_date) from nutrition_history;
select entry_date, weight_kg, calories_consumed_kcal, calorie_target_kcal, protein_g, fiber_g
from nutrition_history
order by entry_date;
```

Expected results for this seed:
- row count: `20`
- date range: `2026-03-19` .. `2026-04-07`

## Decimal comma handling
The seed keeps the CSV's weight literals and converts them in SQL with:

```sql
replace('<value with comma>', ',', '.')::numeric(...)
```

Example:
- CSV `74,15` -> DB `74.15`
