# Refactor: P0-5 — Verify featureGig 403 propagation

**Date:** 2026-05-25
**Status:** Complete (False Positive — Verified Correct)

## Motivation

The refactor priority matrix flagged `featureGig` with "500→403 bug: verifyGigOwnership throws { statusCode: 403 } but the global error handler path may not propagate correctly on this endpoint." This needed verification.

## Scope

- `backend/controllers/gigController.ts` — `_featureGig` handler
- `backend/middleware/asyncHandler.ts` — catch chain
- `backend/index.ts` — global error handler

## Analysis

The propagation path is:

```
verifyGigOwnership() throws { statusCode: 403 }
  → await verifyGigOwnership() in _featureGig rejects
    → asyncHandler(_featureGig).catch(next)
      → Express error handler: typeof err.statusCode === 'number' // 403
        → res.status(403).json({ error: 'Not authorized' })
```

**Verdict: Correct.** No bug exists. `Object.assign(new Error('Not authorized'), { statusCode: 403 })` adds `statusCode` as an own property, and the global error handler checks `typeof err.statusCode === 'number'` (line 50), which evaluates to `true` for 403.

All other endpoints (`_updateGig`, `_triggerMatching`) that call `verifyGigOwnership` share the same `asyncHandler` wrapper and error handler — all propagate 403 correctly.

## Verification

Added test case to `api.test.ts`:

- **returns 403 when ngo does not own the gig** — uses default mock (`single` returns null → gig not found → 403). Asserts status 403 and body `'Not authorized'`.

## Outcome

False positive. No code change needed beyond adding a regression test.
