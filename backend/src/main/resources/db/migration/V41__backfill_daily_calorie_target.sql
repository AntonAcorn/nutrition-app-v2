-- Backfill missing/zero calorie targets on daily nutrition entries from
-- the user's profile. Earlier code paths (water-only writes, weight-only
-- writes, etc.) created daily entries without a target, which made the
-- calorie-bank "−N from bank" badge fire spuriously when consumed > 0.
update daily_nutrition_entries d
set calorie_target_kcal = p.daily_calorie_target_kcal
from user_profiles p
where p.nutrition_user_id = d.user_id
  and (d.calorie_target_kcal is null or d.calorie_target_kcal <= 0);
