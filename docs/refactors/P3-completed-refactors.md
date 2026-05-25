# P3 Completed Refactors

**Date:** 2026-05-25
**Batch:** 3 (5 items evaluated, 2 actionable, 2 false positives, 1 already handled)
**Coverage:** 148 tests pass (112 backend + 36 frontend), TypeScript compiles cleanly.

---

## P3-45 — Add missing `sr-only` labels

**Status:** Already handled (false positive)

**Finding:** Audit claimed interactive icons in MapView, LocationPicker, NgoGigCard, GigCard lack aria-labels.

**Reality:** All interactive SVG-only elements already had labels:
- MapView travel mode buttons: `aria-label` added in P2-41
- Navbar theme toggle: `aria-label="Toggle theme"`
- NotificationBell: `aria-label="Notifications"`
- Navbar mobile hamburger: `aria-label={mobileOpen ? 'Close menu' : 'Open menu'}`
- All other SVG icons are either decorative (accompanying visible text) or non-interactive

**No changes needed.**

---

## P3-48 — Extract weather advisory logic

**Status:** Done

**Problem:** `WeatherIcon` component (~60 lines), `getWeatherDescription` (~14 lines), `getWeatherAdvisory` function (~50 lines), and `WeatherForecast` interface lived inline in `GigDetail.tsx`. This ballooned the file with weather-specific code unrelated to gig display.

**Fix:** Extracted all 4 exports to `frontend/src/utils/weather.ts`:
- `WeatherForecast` (interface)
- `WeatherIcon` (component, 7 SVG conditions)
- `getWeatherDescription` (WMO code → human string)
- `getWeatherAdvisory` (weather → advisory config or null)

**Before:** 86 lines of weather logic inline in `GigDetail.tsx`
**After:** 1 import line in GigDetail; 85 lines in `utils/weather.ts`

**Risk:** Zero. Pure extraction — same exports, same signatures.
**Tests:** No new tests needed (existing coverage sufficient). All 36 frontend tests pass.

---

## P3-49 — Remove dead `skillOverlap` export check

**Status:** False positive

**Finding:** `skillOverlap` in `backend/services/matchingService.ts` is exported but allegedly only used internally.

**Reality:** `skillOverlap` IS used internally (3 call sites at lines 67, 111, 129) AND is imported and tested by `matchingService.test.ts` (8 test cases, lines 20-45). Removing the `export` would break imports.

**No changes needed.**

---

## P3-50 — Clean up `Login.tsx` dynamic supabase import

**Status:** Done

**Problem:** `Login.tsx` used two `await import('../lib/supabase')` dynamic imports (lines 30, 35) to call `supabase.auth.getSession()` and `supabase.from('profiles').select('role')`. This is wasteful — the module is already available as a static dependency.

**Fix:**
1. Added static `import { supabase } from '../lib/supabase'` at top of file
2. Replaced both dynamic imports with direct `supabase` calls

**Before:**
```ts
const { data: session } = await import('../lib/supabase').then((m) =>
  m.supabase.auth.getSession()
);
// ...
const { data: prof } = await import('../lib/supabase').then((m) =>
  m.supabase.from('profiles').select('role').eq('id', userId).single()
);
```

**After:**
```ts
const { data: session } = await supabase.auth.getSession();
// ...
const { data: prof } = await supabase
  .from('profiles').select('role').eq('id', userId).single();
```

**Risk:** Zero. Same API, same behavior, just eliminated redundant async module loading.
**Tests:** All 36 frontend tests pass. TypeScript compiles cleanly.

---

## P3-51 — Inline `cors` or document proxy requirement

**Status:** Already minimal (false positive)

**Finding:** Audit claimed "45 lines of middleware for 5 lines of manual headers."

**Reality:** Current CORS setup is 7 lines using the standard `cors` npm package:
```ts
app.use(
  cors({
    origin: isDev ? true : process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
```
This is clean, maintainable, and handles preflight requests. Replacing with manual headers would regress functionality with no benefit.

**No changes needed.**

---

## Summary

| # | Item | Status | Δ Lines |
|---|---|---|---|
| 45 | sr-only labels | Already handled | 0 |
| 48 | Extract weather logic | Done | -85 in GigDetail, +85 in weather.ts |
| 49 | Remove dead export | False positive | 0 |
| 50 | Dynamic supabase import | Done | +1 (static import), -12 (dynamic) |
| 51 | Inline cors | Already minimal | 0 |

**Net change:** -11 lines of code. Zero behavioral changes. 148 tests pass.
