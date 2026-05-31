-- Trial gaming protection: a user who deletes their account and re-registers
-- with the same email should NOT receive a fresh 7-day Pro trial. We hash the
-- email with a server-side salt and persist the hash here. Hard-delete of the
-- auth account leaves this row in place, so the next bootstrap sees the hash
-- and skips trial fields. The hash + salt construction means we cannot recover
-- the email from this table — GDPR-safe.

CREATE TABLE trial_email_hash (
    email_hash      VARCHAR(64) PRIMARY KEY,
    first_trial_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
