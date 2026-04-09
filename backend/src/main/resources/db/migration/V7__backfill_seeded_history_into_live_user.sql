insert into daily_nutrition_entries (
    user_id,
    entry_date,
    weight_kg,
    calories_consumed_kcal,
    calorie_target_kcal,
    protein_g,
    fat_g,
    fiber_g,
    notes
)
select
    '00000000-0000-0000-0000-000000000001'::uuid as user_id,
    seeded.entry_date,
    seeded.weight_kg,
    seeded.calories_consumed_kcal,
    seeded.calorie_target_kcal,
    seeded.protein_g,
    seeded.fat_g,
    seeded.fiber_g,
    seeded.notes
from daily_nutrition_entries seeded
left join daily_nutrition_entries live
    on live.user_id = '00000000-0000-0000-0000-000000000001'::uuid
   and live.entry_date = seeded.entry_date
where seeded.user_id = '11111111-1111-1111-1111-111111111111'::uuid
  and live.id is null;
