create table if not exists nutrition_history (
    id uuid primary key default gen_random_uuid(),
    entry_date date not null unique,
    weight_kg numeric(6,2),
    calories_consumed_kcal numeric(10,2) not null,
    calorie_target_kcal numeric(10,2) not null,
    protein_g numeric(10,2),
    fiber_g numeric(10,2),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_nutrition_history_entry_date on nutrition_history(entry_date);
