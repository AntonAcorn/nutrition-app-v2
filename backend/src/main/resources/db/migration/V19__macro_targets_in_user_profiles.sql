alter table user_profiles
    add column if not exists protein_target_g numeric(8, 1),
    add column if not exists fat_target_g     numeric(8, 1),
    add column if not exists carbs_target_g   numeric(8, 1),
    add column if not exists fiber_target_g   numeric(8, 1);
