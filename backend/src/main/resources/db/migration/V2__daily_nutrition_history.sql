create table if not exists daily_nutrition_entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    entry_date date not null,
    weight_kg numeric(6,2),
    calories_consumed_kcal numeric(10,2) not null,
    calorie_target_kcal numeric(10,2),
    protein_g numeric(10,2),
    fiber_g numeric(10,2),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, entry_date)
);

create index if not exists idx_daily_nutrition_entries_user_date
    on daily_nutrition_entries (user_id, entry_date);
