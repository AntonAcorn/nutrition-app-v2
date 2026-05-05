-- Allow web push fields to be null (APNs subscriptions don't have them)
ALTER TABLE push_subscriptions
    ALTER COLUMN endpoint DROP NOT NULL,
    ALTER COLUMN p256dh  DROP NOT NULL,
    ALTER COLUMN auth    DROP NOT NULL;

-- Add APNs device token and platform discriminator
ALTER TABLE push_subscriptions
    ADD COLUMN device_token TEXT,
    ADD COLUMN platform     VARCHAR(10) NOT NULL DEFAULT 'web';

-- Unique constraint for APNs tokens
ALTER TABLE push_subscriptions
    ADD CONSTRAINT uq_push_subscriptions_user_device_token UNIQUE (user_id, device_token);
