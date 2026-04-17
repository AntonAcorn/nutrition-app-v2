create table if not exists auth_accounts (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    password_hash text not null,
    display_name text,
    nutrition_user_id uuid references users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_login_at timestamptz
);

create unique index if not exists uq_auth_accounts_email_lower
    on auth_accounts (lower(email));

create unique index if not exists uq_auth_accounts_nutrition_user_id
    on auth_accounts (nutrition_user_id)
    where nutrition_user_id is not null;
