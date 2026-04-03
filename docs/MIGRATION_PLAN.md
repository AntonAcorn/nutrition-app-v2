# Migration plan: Google Sheets -> PostgreSQL

## Goal
Move source of truth from Sheets to PostgreSQL gradually, without big-bang rewrite.

## Phase 1
- Launch new standalone project structure
- Add PostgreSQL-backed backend skeleton
- Keep old system running untouched
- Define schema + API contracts

## Phase 2
- Implement core write flow:
  - create day
  - create manual meal entry
  - upload photo
  - create analysis request
  - store draft
  - confirm draft into meal entry

## Phase 3
- Add read views:
  - day totals
  - meal history
  - meal detail

## Phase 4
- Build one-time or repeatable importer from Google Sheets
- Mark imported records with `source_type=imported_sheet`
- Validate totals against historical sheet rows

## Phase 5
- Switch frontend to PostgreSQL-backed API
- Keep Sheets as fallback/export only if still needed

## Phase 6
- Retire bridge once confidence is high
