alter table user_profiles
    add column if not exists daily_bank_cap_kcal      integer not null default 300,
    add column if not exists bank_max_kcal            integer not null default 2000,
    add column if not exists relax_days_per_month     integer not null default 2;

create table if not exists relax_days (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users(id) on delete cascade,
    relax_date  date not null,
    created_at  timestamptz not null default now(),
    constraint uk_relax_days_user_date unique (user_id, relax_date)
);

create index if not exists idx_relax_days_user_date
    on relax_days (user_id, relax_date desc);
