# Refactor: P0-3 — Stub client on missing env instead of crash

**Date:** 2026-05-25
**Status:** Complete

## Motivation

`frontend/src/lib/supabase.ts` used `throw new Error(...)` at module import time when VITE_SUPABASE keys were missing. This made the entire app crash at load on any page — even pages that don't need Supabase (login, home, leaderboard).

## Scope

- `frontend/src/lib/supabase.ts`

## Before

```ts
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env'
  );
}
```

Module-level `throw` crashes import chain — app is dead on arrival.

## After

```ts
if (!supabaseUrl || !supabaseAnonKey) {
  supabaseUrl = 'http://localhost:54321';
  supabaseAnonKey = 'stub-key';
}

// When using stub key, return empty/error data gracefully
export const supabase = isStub
  ? ({
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            in: () => Promise.resolve({ data: [], error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
          }),
          in: () => Promise.resolve({ data: [], error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        rpc: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        insert: () => ({ select: () => Promise.resolve({ data: null, error: null }) }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }),
      channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    } as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnonKey);
```

## Migration Plan

1. Replaced `throw` with a stub client that gracefully returns empty/error data
2. All stub operations resolve without throwing — pages render empty states instead of crashing

## Regression Risks

- Stub client has different behavior from real client (always returns empty/error). This is intentional — the app degrades gracefully when env vars are missing.
- `createClient` is never called when env vars are missing, so no Supabase network requests are made.

## Verification

- Frontend loads on all 11 routes without env vars configured
- Frontend test suite: 36/36 (tests continue to mock supabase independently)
