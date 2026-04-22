drop index if exists uq_auth_accounts_google_oauth_id;

alter table auth_accounts
    drop column if exists google_oauth_id;
