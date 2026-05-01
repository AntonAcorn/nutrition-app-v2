alter table daily_nutrition_entries add column if not exists carbs_g numeric(10, 2) not null default 0;
alter table meal_templates add column if not exists total_carbs numeric(10, 2) not null default 0;
