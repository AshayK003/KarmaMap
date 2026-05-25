# Bug: Routing path not updating when switching markers

**Reported:** 2026-05-26
**Severity:** Medium
**Status:** Fixed

## Description

When clicking a different gig marker on the map, the OSRM route path from the previous gig remained visible instead of immediately switching to the new gig's route. The old Polyline would only disappear after the async OSRM fetch completed for the new gig, creating a stale route overlay.

## Steps to Reproduce

1. Open Volunteer Map (`/map`)
2. Click gig marker A → route path appears
3. Click gig marker B (different location) → old route path for A is still visible
4. Wait for OSRM fetch to complete → route path eventually updates to B

## Expected Behavior

The route path should immediately reflect the newly selected gig — cached routes should swap instantly with no flash; uncached routes should clear immediately so no stale path is visible.

## Actual Behavior

The old route path persisted until the async OSRM route calculation for the new gig completed, creating a visible race window.

## Root Cause

The marker click handler (`MapView.tsx:299`) only called `setSelectedGig(gig)`. The route calculation was delegated entirely to a `useEffect` that depended on `selectedGig`. When `selectedGig` changed, the effect would:

1. For **cached** routes: set the new `activeRoute` — but the old route remained in state until the next render flush
2. For **uncached** routes: call `setActiveRoute(null)` then start the async fetch — but the timing gap between render and effect execution left the old Polyline visible

Additionally, the `useEffect` at line 115 (which clears routes on `gigs`/`lat`/`lng` change) did not reliably fire on Refresh because `React.memo` combined with array-reference stability could skip the re-render.

## Fix

Two changes in `MapView.tsx`:

1. **Marker click handler** (`eventHandlers.click`): Check `routeCache.current` synchronously. If the route for the selected gig + travelMode is cached, call `setActiveRoute` immediately. If not, call `setActiveRoute(null)` to clear the old path. Then call `setSelectedGig(gig)`. This eliminates the useEffect timing gap.

2. **`refreshCounter` prop**: Added `refreshCounter` state in `VolunteerMap.tsx` (incremented on every `loadGigs` call), passed to MapView, and added to the clear-route `useEffect` dependency array. The `useEffect` at line 115 now depends on `[lat, lng, gigs, refreshCounter]`, guaranteeing route clear on Refresh regardless of React.memo behavior.

## Regression Risk

Low. Cached routes are still set in both the click handler and the useEffect (harmless redundancy). The useEffect continues to handle travelMode switches and location changes. The `refreshCounter` only adds an extra trigger to an existing effect.

## Verification

1. Click marker A → route path appears
2. Click marker B → route path immediately updates (cached) or old path disappears (uncached)
3. Click Refresh → all routes cleared, map resets
