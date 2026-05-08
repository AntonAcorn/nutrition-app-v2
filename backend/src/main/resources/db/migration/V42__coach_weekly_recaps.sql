create table if not exists coach_weekly_recaps (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references users(id) on delete cascade,
    week_start    date not null,
    content_json  text not null,
    source        varchar(64) not null,
    generated_at  timestamptz not null default now(),
    dismissed_at  timestamptz,
    share_token   varchar(48),
    constraint uk_coach_weekly_recaps_user_week unique (user_id, week_start)
);

create index idx_coach_weekly_recaps_user_generated
    on coach_weekly_recaps (user_id, generated_at desc);
