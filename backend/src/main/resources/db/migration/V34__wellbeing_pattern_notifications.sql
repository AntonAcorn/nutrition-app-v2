CREATE TABLE wellbeing_pattern_notifications (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL,
    food_key    text        NOT NULL,
    tone        text        NOT NULL,
    notified_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, food_key)
);

CREATE INDEX idx_wellbeing_pattern_notif_user ON wellbeing_pattern_notifications(user_id);
