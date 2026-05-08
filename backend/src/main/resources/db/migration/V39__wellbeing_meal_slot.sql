alter table wellbeing_entries
    add column if not exists meal_slot varchar(20);

create index if not exists idx_wellbeing_entries_user_slot
    on wellbeing_entries (user_id, meal_slot);
