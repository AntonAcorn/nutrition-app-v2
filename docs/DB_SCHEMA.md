# Initial DB schema draft

## users
- id (uuid, pk)
- external_ref (text, nullable)
- display_name (text)
- created_at

## days
- id (uuid, pk)
- user_id (uuid, fk -> users)
- day_date (date)
- notes (text, nullable)
- created_at
- updated_at
- unique(user_id, day_date)

## meal_entries
- id (uuid, pk)
- day_id (uuid, fk -> days)
- source_type (text) -- manual | photo_confirmed | imported_sheet
- meal_type (text, nullable) -- breakfast/lunch/dinner/snack
- title (text, nullable)
- calories_kcal (numeric)
- protein_g (numeric, nullable)
- fiber_g (numeric, nullable)
- fat_g (numeric, nullable)
- carbs_g (numeric, nullable)
- confirmed_by_user (boolean)
- confirmed_at (timestamp, nullable)
- created_at
- updated_at

## meal_photos
- id (uuid, pk)
- meal_entry_id (uuid, nullable fk -> meal_entries)
- storage_path (text)
- original_filename (text, nullable)
- mime_type (text, nullable)
- file_size_bytes (bigint, nullable)
- sha256 (text, nullable)
- uploaded_at

## analysis_requests
- id (uuid, pk)
- meal_photo_id (uuid, fk -> meal_photos)
- status (text) -- pending | processing | completed | failed | cancelled
- analyzer_version (text, nullable)
- requested_at
- started_at (timestamp, nullable)
- finished_at (timestamp, nullable)
- error_message (text, nullable)

## analysis_drafts
- id (uuid, pk)
- analysis_request_id (uuid, fk -> analysis_requests)
- draft_json (jsonb)
- summary_text (text, nullable)
- estimated_calories_kcal (numeric, nullable)
- estimated_protein_g (numeric, nullable)
- estimated_fiber_g (numeric, nullable)
- created_at

## optional: audit_log
- id (uuid, pk)
- entity_type (text)
- entity_id (uuid)
- action_type (text)
- payload_json (jsonb)
- created_at

## Important rule

Drafts do not become truth automatically.
Truth enters the system only when the user confirms/edits and backend creates/updates a confirmed `meal_entry`.
