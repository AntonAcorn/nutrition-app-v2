create table if not exists fasting_sessions (
    id                uuid        primary key default gen_random_uuid(),
    nutrition_user_id uuid        not null references users(id) on delete cascade,
    started_at        timestamptz not null,
    ended_at          timestamptz,
    target_hours      integer     not null,
    created_at        timestamptz not null default now()
);

create index if not exists idx_fasting_sessions_user
    on fasting_sessions (nutrition_user_id);

create unique index if not exists idx_fasting_sessions_active
    on fasting_sessions (nutrition_user_id)
    where ended_at is null;
