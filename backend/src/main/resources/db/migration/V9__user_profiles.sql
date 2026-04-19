create table user_profiles (
    id                         uuid primary key default gen_random_uuid(),
    nutrition_user_id          uuid not null unique references users(id) on delete cascade,
    age_years                  int not null,
    gender                     text not null,
    height_cm                  numeric(5,1) not null,
    starting_weight_kg         numeric(6,2) not null,
    activity_level             text not null,
    goal                       text not null,
    daily_calorie_target_kcal  numeric(10,2) not null,
    created_at                 timestamptz not null default now(),
    updated_at                 timestamptz not null default now()
);
