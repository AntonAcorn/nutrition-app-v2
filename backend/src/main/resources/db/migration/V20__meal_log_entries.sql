create table if not exists meal_log_entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    entry_date date not null,
    name text not null,
    calories_kcal numeric(10,2) not null default 0,
    protein_g numeric(10,2) not null default 0,
    fat_g numeric(10,2) not null default 0,
    carbs_g numeric(10,2) not null default 0,
    fiber_g numeric(10,2) not null default 0,
    source text,
    created_at timestamptz not null default now()
);

create index if not exists idx_meal_log_entries_user_date
    on meal_log_entries (user_id, entry_date);
