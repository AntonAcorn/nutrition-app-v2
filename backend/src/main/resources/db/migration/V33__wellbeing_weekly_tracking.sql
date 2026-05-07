create table if not exists wellbeing_weekly_tracking (
    id      uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    sent_at timestamptz not null default now()
);

create index idx_wellbeing_weekly_tracking_user
    on wellbeing_weekly_tracking (user_id, sent_at desc);
