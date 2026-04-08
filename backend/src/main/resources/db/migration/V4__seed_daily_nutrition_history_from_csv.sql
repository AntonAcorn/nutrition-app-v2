insert into users (id, external_ref, display_name)
values (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'anton-nutrition-history',
    'Anton Nutrition History'
)
on conflict (id) do update
set
    external_ref = excluded.external_ref,
    display_name = excluded.display_name;

insert into daily_nutrition_entries (
    user_id,
    entry_date,
    weight_kg,
    calories_consumed_kcal,
    calorie_target_kcal,
    protein_g,
    fiber_g
)
values
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-19', replace('74,15', ',', '.')::numeric(6,2), 1520::numeric(10,2), 2000::numeric(10,2), 68::numeric(10,2), 13::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-20', replace('73,5', ',', '.')::numeric(6,2), 2185::numeric(10,2), 2000::numeric(10,2), 98::numeric(10,2), 18::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-21', replace('73,5', ',', '.')::numeric(6,2), 2080::numeric(10,2), 2000::numeric(10,2), 94::numeric(10,2), 17::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-22', replace('74,15', ',', '.')::numeric(6,2), 2115::numeric(10,2), 2000::numeric(10,2), 95::numeric(10,2), 18::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-23', replace('73,5', ',', '.')::numeric(6,2), 1530::numeric(10,2), 2000::numeric(10,2), 69::numeric(10,2), 13::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-24', replace('73,1', ',', '.')::numeric(6,2), 1926::numeric(10,2), 2000::numeric(10,2), 87::numeric(10,2), 16::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-25', replace('73,2', ',', '.')::numeric(6,2), 1840::numeric(10,2), 2000::numeric(10,2), 83::numeric(10,2), 15::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-26', replace('73,25', ',', '.')::numeric(6,2), 1880::numeric(10,2), 2000::numeric(10,2), 85::numeric(10,2), 16::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-27', replace('73,2', ',', '.')::numeric(6,2), 3000::numeric(10,2), 2000::numeric(10,2), 135::numeric(10,2), 25::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-28', replace('73,7', ',', '.')::numeric(6,2), 2660::numeric(10,2), 2000::numeric(10,2), 120::numeric(10,2), 22::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-29', replace('73,6', ',', '.')::numeric(6,2), 2310::numeric(10,2), 2000::numeric(10,2), 104::numeric(10,2), 19::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-30', replace('74,3', ',', '.')::numeric(6,2), 1500::numeric(10,2), 2000::numeric(10,2), 65::numeric(10,2), 12::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-03-31', replace('73,8', ',', '.')::numeric(6,2), 1840::numeric(10,2), 2000::numeric(10,2), 90::numeric(10,2), 11::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-04-01', replace('73,4', ',', '.')::numeric(6,2), 2690::numeric(10,2), 2000::numeric(10,2), 177::numeric(10,2), 23::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-04-02', replace('72,7', ',', '.')::numeric(6,2), 1545::numeric(10,2), 2000::numeric(10,2), 83::numeric(10,2), 16::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-04-03', replace('72,6', ',', '.')::numeric(6,2), 3500::numeric(10,2), 2000::numeric(10,2), 125::numeric(10,2), 16::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-04-04', replace('73,8', ',', '.')::numeric(6,2), 1700::numeric(10,2), 2000::numeric(10,2), 115::numeric(10,2), 17::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-04-05', replace('73,4', ',', '.')::numeric(6,2), 1340::numeric(10,2), 2000::numeric(10,2), 49::numeric(10,2), 12::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-04-06', replace('72,8', ',', '.')::numeric(6,2), 1740::numeric(10,2), 2000::numeric(10,2), 140::numeric(10,2), 20::numeric(10,2)),
    ('11111111-1111-1111-1111-111111111111'::uuid, '2026-04-07', replace('72,8', ',', '.')::numeric(6,2), 1490::numeric(10,2), 2000::numeric(10,2), 97::numeric(10,2), 13::numeric(10,2))
on conflict (user_id, entry_date) do update
set
    weight_kg = excluded.weight_kg,
    calories_consumed_kcal = excluded.calories_consumed_kcal,
    calorie_target_kcal = excluded.calorie_target_kcal,
    protein_g = excluded.protein_g,
    fiber_g = excluded.fiber_g,
    updated_at = now();
