create table if not exists user_insights (
    id                    uuid primary key default gen_random_uuid(),
    user_id               uuid not null references users(id) on delete cascade,
    generated_at          timestamptz not null default now(),
    valid_until           timestamptz not null,
    snapshot_window_days  int not null,
    kind                  varchar(32) not null,
    title                 varchar(160) not null,
    body                  varchar(600) not null,
    anchor                varchar(600),
    source                varchar(64) not null
);

create index idx_user_insights_user_valid
    on user_insights (user_id, valid_until desc);

create index idx_user_insights_user_generated
    on user_insights (user_id, generated_at desc);
