create table if not exists coach_triggers (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references users(id) on delete cascade,
    kind         varchar(48) not null,
    fired_at     timestamptz not null default now(),
    payload_json text
);

create index idx_coach_triggers_user_kind_fired
    on coach_triggers (user_id, kind, fired_at desc);
