-- Per-type push notification toggles. The existing `enabled` column is the
-- master switch (disables every notification at once); the three new columns
-- let the user opt out of individual reminder kinds — for example, keep the
-- daily log nudge but silence streak emojis.

ALTER TABLE push_subscriptions
    ADD COLUMN notify_daily_log BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notify_bank_win  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN notify_streak    BOOLEAN NOT NULL DEFAULT TRUE;
