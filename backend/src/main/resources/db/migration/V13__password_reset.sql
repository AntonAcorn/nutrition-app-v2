alter table auth_accounts
    add column password_reset_token text,
    add column password_reset_token_expires_at timestamp with time zone;
