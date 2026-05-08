alter table user_insights
    add column if not exists dismissed_at timestamptz;
