insert into users (id, external_ref, display_name)
values ('00000000-0000-0000-0000-000000000001'::uuid, 'default-app-user', 'Default App User')
on conflict (id) do nothing;
