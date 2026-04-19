alter table auth_accounts
    add column email_verified boolean not null default false,
    add column verification_token text,
    add column verification_token_expires_at timestamp with time zone;

update auth_accounts set email_verified = true;
