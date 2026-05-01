alter table user_profiles
    add column if not exists water_goal_glasses integer not null default 4;
