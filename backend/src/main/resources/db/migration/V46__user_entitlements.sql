-- Tracks per-user monetization state: 7-day Pro trial, paid subscription,
-- Founder Lifetime (one-time), and daily AI usage counters for free tier.
-- See memory/project_monetization.md and docs/APP_STORE_METADATA.md.

create table if not exists user_entitlements (
    user_id uuid primary key references users(id) on delete cascade,

    -- 7-day trial
    trial_started_at timestamptz,
    trial_ends_at timestamptz,

    -- Recurring Pro subscription (RevenueCat reports current period end)
    pro_active_until timestamptz,

    -- Founder Lifetime (one-time, non-consumable IAP). First 200 buyers.
    founder_purchased_at timestamptz,
    founder_number integer,

    -- Daily AI quota for free tier. Counters reset when ai_usage_date != today.
    ai_photo_used_today integer not null default 0,
    ai_voice_used_today integer not null default 0,
    ai_usage_date date,

    -- Link to RevenueCat app_user_id (set on first purchase). Allows webhook
    -- updates to find our user without leaking our UUIDs in receipts.
    revenuecat_app_user_id text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists idx_user_entitlements_founder_number
    on user_entitlements (founder_number) where founder_number is not null;

create unique index if not exists idx_user_entitlements_rc_user_id
    on user_entitlements (revenuecat_app_user_id) where revenuecat_app_user_id is not null;

create index if not exists idx_user_entitlements_trial_ends
    on user_entitlements (trial_ends_at) where trial_ends_at is not null;

create index if not exists idx_user_entitlements_pro_until
    on user_entitlements (pro_active_until) where pro_active_until is not null;

-- Backfill: every existing user gets a 7-day trial starting now. This
-- preserves goodwill with beta testers — they get the same trial as launch
-- users instead of being silently downgraded to free tier on deploy.
insert into user_entitlements (user_id, trial_started_at, trial_ends_at)
select id, now(), now() + interval '7 days'
from users
on conflict (user_id) do nothing;
