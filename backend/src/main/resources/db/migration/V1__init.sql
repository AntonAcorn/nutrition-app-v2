create extension if not exists pgcrypto;

create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    external_ref text,
    display_name text not null,
    created_at timestamptz not null default now()
);

create table if not exists days (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id),
    day_date date not null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, day_date)
);

create table if not exists meal_entries (
    id uuid primary key default gen_random_uuid(),
    day_id uuid not null references days(id) on delete cascade,
    source_type text not null,
    meal_type text,
    title text,
    calories_kcal numeric(10,2) not null default 0,
    protein_g numeric(10,2),
    fiber_g numeric(10,2),
    fat_g numeric(10,2),
    carbs_g numeric(10,2),
    confirmed_by_user boolean not null default false,
    confirmed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists meal_photos (
    id uuid primary key default gen_random_uuid(),
    meal_entry_id uuid references meal_entries(id) on delete set null,
    storage_path text not null,
    original_filename text,
    mime_type text,
    file_size_bytes bigint,
    sha256 text,
    uploaded_at timestamptz not null default now()
);

create table if not exists analysis_requests (
    id uuid primary key default gen_random_uuid(),
    meal_photo_id uuid not null references meal_photos(id) on delete cascade,
    status text not null,
    analyzer_version text,
    requested_at timestamptz not null default now(),
    started_at timestamptz,
    finished_at timestamptz,
    error_message text
);

create table if not exists analysis_drafts (
    id uuid primary key default gen_random_uuid(),
    analysis_request_id uuid not null references analysis_requests(id) on delete cascade,
    draft_json jsonb not null,
    summary_text text,
    estimated_calories_kcal numeric(10,2),
    estimated_protein_g numeric(10,2),
    estimated_fiber_g numeric(10,2),
    created_at timestamptz not null default now()
);

create index if not exists idx_days_user_date on days(user_id, day_date);
create index if not exists idx_meal_entries_day on meal_entries(day_id);
create index if not exists idx_analysis_requests_status on analysis_requests(status);
