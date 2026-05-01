alter table daily_nutrition_entries
    add column if not exists water_glasses integer not null default 0;
