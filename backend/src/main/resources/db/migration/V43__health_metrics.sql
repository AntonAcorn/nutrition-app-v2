create table if not exists health_metrics (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    metric_date     date not null,
    steps           int,
    active_kcal     int,
    sleep_minutes   int,
    workout_minutes int,
    workout_count   int,
    updated_at      timestamptz not null default now(),
    constraint uk_health_metrics_user_date unique (user_id, metric_date)
);

create index idx_health_metrics_user_date_desc
    on health_metrics (user_id, metric_date desc);
