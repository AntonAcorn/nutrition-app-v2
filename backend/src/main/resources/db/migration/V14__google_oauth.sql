alter table auth_accounts alter column password_hash drop not null;

alter table auth_accounts add column google_oauth_id text;

create unique index if not exists uq_auth_accounts_google_oauth_id
    on auth_accounts (google_oauth_id)
    where google_oauth_id is not null;
