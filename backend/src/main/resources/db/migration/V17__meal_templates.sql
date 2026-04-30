create table meal_templates (
    id               uuid primary key default gen_random_uuid(),
    nutrition_user_id uuid not null references users(id),
    name             text not null,
    items_json       text not null default '[]',
    total_calories   numeric(10, 2) not null default 0,
    total_protein    numeric(10, 2) not null default 0,
    total_fat        numeric(10, 2) not null default 0,
    total_fiber      numeric(10, 2) not null default 0,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index idx_meal_templates_user on meal_templates (nutrition_user_id);
