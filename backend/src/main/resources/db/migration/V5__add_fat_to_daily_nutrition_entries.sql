alter table daily_nutrition_entries
    add column if not exists fat_g numeric(10,2);
