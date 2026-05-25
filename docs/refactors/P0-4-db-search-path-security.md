# Refactor: P0-4 — Add `SET search_path` to SECURITY DEFINER functions

**Date:** 2026-05-25
**Status:** Complete

## Motivation

Two database functions (`award_karma`, `get_ngo_analytics`) were created with `SECURITY DEFINER` but no `SET search_path` clause. This allows an attacker to create objects in a schema earlier in `search_path` that shadow real objects, potentially elevating privileges when the function runs.

All other SECURITY DEFINER functions in the codebase already had `SET search_path = public, extensions`.

## Scope

- `supabase/migrations/03_atomic_karma.sql` — `award_karma`
- `supabase/migrations/04_analytics_optimization.sql` — `get_ngo_analytics`

## Before

```sql
CREATE OR REPLACE FUNCTION award_karma(...)
RETURNS ...
SECURITY DEFINER
LANGUAGE plpgsql AS $$ ... $$;
```

No `search_path` restriction.

## After

```sql
CREATE OR REPLACE FUNCTION award_karma(...)
RETURNS ...
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql AS $$ ... $$;
```

## Migration Plan

1. Added `SET search_path = 'public'` to both function definitions
2. Note: `set_updated_at` trigger function is `SECURITY INVOKER` (not affected); `nearby_gigs`, `insert_gig`, `match_volunteers_for_gig`, `nearby_volunteers_for_gig`, `update_profile_location` already had `SET search_path = public, extensions` in `01_functions_and_realtime.sql`

## Regression Risks

- `search_path = 'public'` restricts function to only see objects in `public` schema. All function references (tables, types, functions) are in `public`, so no impact.
- If any future migration creates objects in a different schema, these functions won't see them — this is the intended security behavior.

## Verification

- Migration files are re-runnable (OR REPLACE). No data loss.
- No tests change — behavior is identical.
