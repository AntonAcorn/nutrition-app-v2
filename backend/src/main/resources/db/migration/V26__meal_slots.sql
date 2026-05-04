create table if not exists meal_slots (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users(id) on delete cascade,
    entry_date  date not null,
    slot_type   varchar(20) not null,
    sort_order  int not null,
    created_at  timestamptz not null default now()
);

create unique index if not exists uk_meal_slots_user_date_type
    on meal_slots (user_id, entry_date, slot_type);

create index if not exists idx_meal_slots_user_date
    on meal_slots (user_id, entry_date);

alter table meal_log_entries
    add column if not exists meal_slot_id uuid references meal_slots(id) on delete cascade;

-- backfill: one SNACK slot per (user_id, entry_date) for all existing entries
insert into meal_slots (user_id, entry_date, slot_type, sort_order)
select distinct user_id, entry_date, 'SNACK', 3
from meal_log_entries
on conflict do nothing;

update meal_log_entries mle
set meal_slot_id = ms.id
from meal_slots ms
where ms.user_id    = mle.user_id
  and ms.entry_date = mle.entry_date
  and ms.slot_type  = 'SNACK'
  and mle.meal_slot_id is null;
