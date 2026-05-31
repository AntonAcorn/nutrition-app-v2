-- Track when each subscription last received a push so the scheduler can
-- dedup ("already greeted today") and so the streak-save slot at 21:00 can
-- decide whether the regular slot at reminder_hour already nudged the user.
ALTER TABLE push_subscriptions
    ADD COLUMN last_sent_at TIMESTAMPTZ;
