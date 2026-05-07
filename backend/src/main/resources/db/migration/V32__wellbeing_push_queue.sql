create table if not exists wellbeing_push_queue (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references users(id) on delete cascade,
    scheduled_at timestamptz not null,
    sent_at      timestamptz,
    responded_at timestamptz,
    created_at   timestamptz not null default now()
);

create index idx_wellbeing_push_queue_pending
    on wellbeing_push_queue (scheduled_at)
    where sent_at is null;
