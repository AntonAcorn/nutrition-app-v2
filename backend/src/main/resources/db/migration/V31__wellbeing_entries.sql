create table if not exists wellbeing_entries (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references users(id) on delete cascade,
    rating     smallint not null check (rating between 1 and 5),
    entry_date date not null,
    created_at timestamptz not null default now()
);

create index idx_wellbeing_entries_user_created
    on wellbeing_entries (user_id, created_at desc);
