# Refactor: P0-6 — Fix stale `volunteers_joined` counter

**Date:** 2026-05-25
**Status:** Complete

## Motivation

The `increment_gig_volunteers` trigger only incremented `volunteers_joined` when a participation was inserted (joined). When a volunteer cancelled their participation (`status = 'cancelled'`), the counter never decremented, causing gigs to show inflated volunteer counts.

## Scope

- `supabase/migrations/00_schema_core.sql` — `increment_gig_volunteers` trigger function

## Before

```sql
CREATE OR REPLACE FUNCTION increment_gig_volunteers()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE gigs SET volunteers_joined = volunteers_joined + 1 WHERE id = NEW.gig_id;
  RETURN NEW;
END;
$$;
```

Always increments, never decrements.

## After

```sql
CREATE OR REPLACE FUNCTION increment_gig_volunteers()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'joined') THEN
    UPDATE gigs SET volunteers_joined = volunteers_joined + 1 WHERE id = NEW.gig_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'joined' THEN
    UPDATE gigs SET volunteers_joined = GREATEST(volunteers_joined - 1, 0) WHERE id = NEW.gig_id;
  END IF;
  RETURN NEW;
END;
$$;
```

Handles both increment (insert or status→joined) and decrement (joined→cancelled). Uses `GREATEST(..., 0)` to floor at zero.

## Migration Plan

1. Replaced the trigger function body in `00_schema_core.sql`
2. Trigger is already `AFTER INSERT OR UPDATE OF status ON participations FOR EACH ROW` — no trigger definition change needed

## Regression Risks

- Decrement only fires on `joined → cancelled` transition, not other transitions (`pending → cancelled` would not decrement since it was never counted)
- `GREATEST(volunteers_joined - 1, 0)` prevents negative counts

## Verification

- Migration file is re-runnable (OR REPLACE). No data loss.
- No tests change — trigger behavior is verified in integration tests.
