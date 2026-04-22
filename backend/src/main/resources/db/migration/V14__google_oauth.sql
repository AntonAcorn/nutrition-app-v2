alter table auth_accounts
    alter column password_hash drop not null;

alter table auth_accounts
    add column if not exists google_id text;

create unique index if not exists uq_auth_accounts_google_id
    on auth_accounts (google_id)
    where google_id is not null;
