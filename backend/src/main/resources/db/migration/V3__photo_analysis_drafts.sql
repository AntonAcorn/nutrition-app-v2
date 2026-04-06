create table if not exists photo_analysis_drafts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    entry_date date not null,
    status text not null,
    analysis_json text not null,
    estimated_calories_kcal numeric(10,2),
    estimated_protein_g numeric(10,2),
    estimated_fiber_g numeric(10,2),
    confirmed_daily_entry_id uuid references daily_nutrition_entries(id) on delete set null,
    confirmed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_photo_analysis_drafts_user_date
    on photo_analysis_drafts (user_id, entry_date);

create index if not exists idx_photo_analysis_drafts_status
    on photo_analysis_drafts (status);

