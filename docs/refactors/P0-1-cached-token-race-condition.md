# Refactor: P0-1 — Fix `cachedToken` race condition

**Date:** 2026-05-25
**Status:** Complete

## Motivation

Module-level `cachedToken` and `onAuthStateChange` subscription in `api.ts` created a race condition: if Supabase refreshes the JWT between the `cachedToken` read and the `fetch` call, a stale token is used — resulting in silent 401 from the server.

Additionally, the `onAuthStateChange` subscription was never unsubscribed (hidden memory leak).

## Scope

- `frontend/src/utils/api.ts`
- `frontend/src/__tests__/apiFetch.test.ts`

## Before

```ts
let cachedToken: string | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
});

export async function apiFetch<T>(...) {
  const token = cachedToken; // stale if refresh event fires between this read and fetch()
```

## After

```ts
export async function apiFetch<T>(...) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? null; // fresh per request
```

## Migration Plan

1. Removed `let cachedToken` and `onAuthStateChange` subscription from module-level scope
2. Added `await supabase.auth.getSession()` call inside `apiFetch` to get fresh token per request
3. Updated test mock: removed `onAuthStateChange`, made `getSession` per-test configurable via hoisted variable

## Regression Risks

- `getSession()` adds ~0ms (in-memory read). Minimal overhead per request.
- Omits `Authorization` header when session is null — same behavior as before (null `cachedToken`).
- No API surface change — callers unaffected.

## Verification

- All 4 `apiFetch.test.ts` tests pass (network failure, error parsing, success JSON, authorization header with token)
- Frontend test suite: 36/36
- Backend test suite: 85/85 (unaffected)
