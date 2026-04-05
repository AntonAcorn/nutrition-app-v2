create extension if not exists pgcrypto;

alter table users
    add column if not exists is_default boolean not null default false;

create table if not exists daily_metrics (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    metric_date date not null,
    weight_kg numeric(6,2),
    calories_consumed_kcal numeric(10,2) not null default 0,
    calories_target_kcal numeric(10,2),
    protein_g numeric(10,2),
    fiber_g numeric(10,2),
    data_source text not null default 'manual',
    source_payload jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, metric_date)
);

create table if not exists import_runs (
    id uuid primary key default gen_random_uuid(),
    source_name text not null,
    source_checksum text not null unique,
    imported_rows integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_users_default on users(is_default) where is_default = true;
create index if not exists idx_daily_metrics_user_date on daily_metrics(user_id, metric_date desc);

insert into users(display_name, external_ref, is_default)
select 'Anton', 'primary-user', true
where not exists (select 1 from users where is_default = true);
