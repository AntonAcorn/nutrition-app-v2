-- Goal-agnostic positioning: what does this user actually want to track?
-- Stored as a comma-separated list of tags (energy, mood, weight, performance, all).
-- Empty/null = treat as 'all' for backward compatibility with existing users.
alter table user_profiles
    add column if not exists coach_focus varchar(120);
