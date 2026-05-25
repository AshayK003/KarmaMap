# UX Consistency Audit

**Date:** 2026-05-25
**Scope:** All 11 pages, 12 custom components, 9 shadcn/ui components
**Method:** Visual pattern comparison across every UI file

---

## Summary

| Category | Consistent | Partially | Inconsistent |
|---|---|---|---|
| Form inputs | — | — | 4 different styles across 4 form pages |
| Form error display | — | Login + Signup share a pattern | CreateGig and ParticipateGig use different patterns |
| Label styling | — | Login + Signup match | CreateGig and ParticipateGig use different weights, tracking, colors |
| Buttons | Button component used consistently | Sizes vary (sm/default/lg) | Submit button labels vary wildly |
| Cards | — | — | 5+ different card styling patterns |
| Loading states | — | Skeleton component used in 2 places | 4 different loading patterns across pages |
| Error banners | — | All use SVG warning + red bg | 3 different border-radius and color variants |
| Typography | — | — | Inconsistent font weights, text sizes, color tokens |
| Empty states | — | — | Some pages have empty state, some don't |
| Spacing | — | — | Inconsistent padding/margin values |

---

## 1. Form Input Styles — 4 Different Patterns

### Pattern 1: Login / Signup

```
rounded-xl border border-slate-200 dark:border-slate-600
bg-slate-50/30 dark:bg-slate-800/40
text-sm font-semibold
pl-9 (icon prefix)
focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800
focus:ring-4 focus:ring-emerald-500/10 focus:outline-none
py-2.5
```

Used for: Email, password, name, skills inputs on Login (lines 79-85) and Signup (lines 126-132).

### Pattern 2: CreateGig

```
rounded-2xl border border-slate-200 dark:border-slate-600
bg-white dark:bg-slate-800
text-sm font-semibold
pl-9 (icon prefix) on date/time only
focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500
p-3
```

Used for: Title, description, skills, spots on CreateGig (lines 165-170).
Notable differences from Pattern 1: `rounded-2xl` vs `rounded-xl`, `bg-white` vs `bg-slate-50/30`, `p-3` vs `py-2.5`, `focus:outline-hidden` vs `focus:outline-none`, `focus:ring-1` vs `focus:ring-4`.

### Pattern 3: CreateGig (date/time with `<Input>` shadcn)

```
<Input className="pl-10" />
```

The date and time fields on CreateGig use the shadcn `Input` component while the other form fields use native `<input>` with custom classes. The shadcn Input has different border radius, padding, and focus behavior.

### Pattern 4: ParticipateGig

```
rounded-lg border border-gray-300 dark:border-slate-600
px-3 py-2
(text-sm font-medium implied from parent)
```

Used for: Hours input on ParticipateGig (line 237).
Different from all others: `rounded-lg` (not xl/2xl), `border-gray-300` (not `border-slate-200`), `font-medium` (not `font-semibold`), no icon prefix, no focus ring customization.

### Impact: Users see different-looking inputs on every form page. Visual inconsistency undermines trust.

---

## 2. Form Error Display — 3 Different Patterns

### Pattern A: Login / Signup — Inline field errors

```html
<p class="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1" role="alert">
  <svg class="h-3.5 w-3.5 shrink-0 ...">[warning icon]</svg>
  {message}
</p>
```

Used in: Login (lines 87-93), Signup (lines 134-140).

### Pattern B: CreateGig — `FieldError` component (no icon)

```tsx
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">{message}</p>;
}
```

Used in: CreateGig (lines 30-33, reused at 172, 187, 202, 225, 247, 268).
Differences: `text-rose-600` vs `text-red-600`, no SVG warning icon, `font-bold` vs `font-semibold`, `mt-1.5` vs `mt-1`.

### Pattern C: ParticipateGig — Plain error text

```html
<p class="mt-1 text-xs text-red-600" role="alert">{errors.hours.message}</p>
```

Used in: ParticipateGig (line 241).
Differences: No `font-semibold` or `font-bold`, no SVG icon, no flex layout.

### Pattern D: Root/API errors — Alert banners

Login/Signup/CreateGig use `rounded-xl`/`rounded-2xl` `bg-rose-50` border `border-rose-100` with SVG warning triangle.
ParticipateGig uses `rounded-lg` `bg-red-50` with different SVG.

---

## 3. Label Styling — 3 Different Patterns

| Page | Classes | Font weight | Tracking | Color |
|---|---|---|---|---|
| Login | `text-xs font-bold ... uppercase tracking-wider` | `font-bold` | `tracking-wider` | `text-gray-500` |
| Signup | Same as Login | `font-bold` | `tracking-wider` | `text-gray-500` |
| CreateGig | `text-xs font-extrabold uppercase tracking-widest` | `font-extrabold` | `tracking-widest` | `text-slate-400` |
| ParticipateGig | `text-sm font-medium` | `font-medium` | none | implicit |

Impact: Even "brand-consistent" labels vary — `font-extrabold` vs `font-bold`, `tracking-widest` vs `tracking-wider`, `text-slate-400` vs `text-gray-500`.

---

## 4. Submit Button Labels — No Convention

| Page | Normal Label | Loading Label |
|---|---|---|
| Login | "Sign in" | "Signing in…" |
| Signup | "Sign up" | "Creating account…" |
| CreateGig | "Publish & Match Gig" | "Broadcasting to Volunteers..." |
| ParticipateGig | "Wait for photo uploads…" / "Complete gig & earn karma" | "Submitting…" |
| GigDetail | "Join this gig & serve community" | "Registering Opportunity..." |

Each page uses a different verb and tone. The labels vary from concise ("Sign in") to verbose ("Join this gig & serve community").

---

## 5. Card Styling — 5+ Variants

| Component | Classes | Rounding | Border | Shadow | Background |
|---|---|---|---|---|---|
| shadcn `<Card>` | `rounded-3xl border border-white/20 ... backdrop-blur-md p-6 shadow-md` | `rounded-3xl` | `border-white/20` | `shadow-md` | `bg-white/70 backdrop-blur-md` |
| `GigCard` | `rounded-2xl border border-emerald-50/50 bg-white p-5 shadow-xs` | `rounded-2xl` | `border-emerald-50/50` | `shadow-xs` | `bg-white` |
| `Leaderboard` items | `rounded-2xl border border-slate-100 bg-white p-4 shadow-xs` | `rounded-2xl` | `border-slate-100` | `shadow-xs` | `bg-white` |
| `NgoDashboard` cards | Uses `<Card>` component | `rounded-3xl` | via Card | `shadow-md` | via Card |
| `GigDetail` stats | Uses `<Card>` component | `rounded-3xl` | via Card | `shadow-md` | via Card |
| `ParticipateGig` completed | Native div, no card wrapper | none | none | none | none |

Impact: The same visual element (a card) has 3+ different visual treatments depending on which page or component renders it.

---

## 6. Loading States — 4 Different Patterns

| Page/Component | Pattern | Lines |
|---|---|---|
| `GigCardSkeleton` (VolunteerMap) | Custom component with `Skeleton` children + specific layout | 23-48 |
| `Leaderboard` | Generic `animate-pulse` div bars | 66-68 |
| `ParticipateGig` | CSS spinner + text | 152-154 |
| `GigDetail` | Spinner or "Loading participation…" text | inline |
| `NgoDashboard` | `<Skeleton>` component | 14 |
| `NotificationBell` | No loading state (notifications empty = "no data") | 55-62 |

Impact: Each page implements loading UI independently. A user sees a spinner on one page, skeleton on another, and nothing on a third.

---

## 7. Empty States — Present Only in Some Pages

| Page | Empty State | Quality |
|---|---|---|
| Leaderboard | Dashed border box with "No volunteers ranked yet" | Good |
| NotificationBell | Icon + message + subtitle | Good |
| VolunteerMap | GigCardSkeleton shown while loading; no explicit "no gigs" state | Missing |
| NgoDashboard | No empty state for zero gigs | Missing |
| GigDetail | No error state if gig not found | Missing |
| ParticipateGig | Shows "You need to join this gig" when not joined | Good |
| VolunteerPortfolio | No "no completed gigs" state shown in the audit | Needs check |

---

## 8. Confusing Flows

### 8.1 Signup navigates before email verification

**File:** `Signup.tsx:60`

```ts
navigate(data.role === 'ngo' ? '/ngo/dashboard' : '/map');
```

After signup, the user is immediately navigated to the dashboard — but Supabase sends a confirmation email by default. The user lands on a dashboard with no data (no gigs, no profile loaded) and no indication that email verification is pending. If they close the tab, they may not realize they need to check their email.

**Fix:** Show a confirmation message: "Check your email to verify your account."

---

### 8.2 "Join this gig" toast fires before API call completes

**File:** `GigDetail.tsx:189`

```ts
toast.success('Joining gig...');
// ...then API call
const result = await joinGigViaApi(gigId);
```

The success toast fires before the async operation finishes. If the API fails, the user sees success → error in sequence, which is jarring.

**Fix:** Show a loading toast or inline loading state, then replace with success/error after the API resolves.

---

### 8.3 Both photos required before submit

**File:** `ParticipateGig.tsx:92`

```ts
const canSubmit = !submitting && beforeUrl && afterUrl;
```

The submit button is disabled until both before and after photos are uploaded. If the camera fails on one photo type, the user is stuck. There's no "skip photo" option.

**Fix:** Make photos optional, or allow submitting with one photo.

---

### 8.4 ICS file injection risk

**File:** `GigDetail.tsx:360-380`

Gig title and description are inserted directly into an ICS file without sanitization. A gig titled `Party\nDTSTART:20260101T000000` would break the calendar file.

**Fix:** Sanitize newlines and field separators before ICS insertion.

---

### 8.5 ProtectedRoute redirects without explanation

**File:** `components/ProtectedRoute.tsx:24`

When a user with wrong role accesses a page, they are redirected (volunteer → `/map`, ngo → `/ngo/dashboard`) without any message explaining why.

**Fix:** Add a toast or query parameter explaining the redirect.

---

## 9. Accessibility Issues

### 9.1 Missing `sr-only` labels on interactive elements

| Component | Element | Issue |
|---|---|---|
| `MapView.tsx` | Travel mode buttons (walking/cycling/driving) | No `aria-label` |
| `LocationPicker.tsx` | GPS button, preset buttons | No `aria-label` |
| `NgoGigCard.tsx` | Status action buttons | No `aria-label` |
| `GigCard.tsx` | Skill match badge | Icon-only, no `aria-label` |
| `CreateGig.tsx` | Date/time calendar icons | `pointer-events-none` but no `aria-hidden` on some |

### 9.2 Form fields missing `id`/`htmlFor` association

- CreateGig date/time fields use `<Input>` component but rely on `register()` — the shadcn Input spreads props but the `id` comes from `register`'s automatic `name` mapping. Verified: `register('gig_date')` generates `id="gig_date"` and the label uses `htmlFor="create-gig-date"` — MISMATCH. The label points to `create-gig-date` but the input id is `gig_date`.

### 9.3 Low color contrast in some areas

- `text-gray-400` on `bg-white` in form descriptions (CreateGig:109, 155) — this is approximately #9CA3AF on white, failing WCAG AA at 4.5:1 for small text (14px is the boundary, these are `text-[11px]`)
- `text-slate-400` on `bg-white` footer text (Login:158) — similar contrast failure

### 9.4 `capture="environment"` forces rear camera

**File:** `PhotoUpload.tsx:102`

On mobile, this forces the rear camera with no option to switch. Users who want to use their front camera or upload from the gallery need a file picker fallback.

---

## 10. Inconsistent Spacing Token Usage

The codebase uses a mix of spacing values for similar purposes:

| Context | Values Used |
|---|---|
| Form field gap from label | `space-y-1` (Login), `space-y-1` (Signup), `mt-2` (CreateGig) with `space-y-6` form gap |
| Form submit button margin | `mt-6` (Login footer link), implicit `space-y-6` (CreateGig), `mt-6 space-y-6` (ParticipateGig) |
| Card inner padding | `p-6` (Card default), `p-5` (NgoGigCard), `p-5` (GigCard), `p-4.5` (not a standard Tailwind value — typo?) |
| Gap between elements | `gap-3` (Login buttons), `gap-4` (grid), `gap-6` (rare) |
| Section spacing | `space-y-6` (form), `space-y-4` (form), `space-y-8` (sections) |

Note: `p-4.5` appears in `GigDetail.tsx:428` — `4.5` is NOT a valid Tailwind spacing token. This will be ignored at runtime.

---

## 11. Inconsistent Color Token Usage

The codebase mixes `slate-*`, `gray-*`, `emerald-*`, `teal-*`, `rose-*`, `red-*`:

| Purpose | Pages using `slate-*` | Pages using `gray-*` |
|---|---|---|
| Primary text color | `text-slate-700` (CreateGig) | `text-gray-900` (Login/Signup) |
| Muted text | `text-slate-400` (CreateGig) | `text-gray-400` (Login) |
| Heading | `text-slate-800` (CreateGig) | `text-gray-900` (Login) |
| Input border | `border-slate-200` (CreateGig) | `border-slate-200` (Login) vs `border-gray-300` (ParticipateGig) |

Login/Signup use `text-gray-*` for most text but `border-slate-200` for inputs. CreateGig uses `text-slate-*` everywhere. ParticipateGig uses a mix.

---

## 12. Recommendation Priority

| Priority | Fix | Effort |
|---|---|---|
| **HIGH** | Standardize input styles across all 4 form pages to a single pattern | 1 hour |
| **HIGH** | Standardize error display (create a shared `FieldError` component with icon) | 30 min |
| **HIGH** | Fix label `id`/`htmlFor` mismatch on CreateGig date/time fields | 5 min |
| **HIGH** | Fix `p-4.5` invalid Tailwind value in GigDetail | 1 min |
| **HIGH** | Remove "success" toast before API call in GigDetail | 5 min |
| **MEDIUM** | Standardize submit button labels to a concise convention | 30 min |
| **MEDIUM** | Add empty state for VolunteerMap (no gigs found) | 15 min |
| **MEDIUM** | Add empty state for NgoDashboard (no gigs) | 15 min |
| **MEDIUM** | Add `aria-label` to MapView travel mode buttons | 10 min |
| **MEDIUM** | Show email verification message after signup | 15 min |
| **MEDIUM** | Make photos optional in ParticipateGig or allow partial submission | 30 min |
| **LOW** | Standardize card styling (use `<Card>` component everywhere) | 1-2 hours |
| **LOW** | Standardize loading skeleton pattern (use `<Skeleton>` consistently) | 1 hour |
| **LOW** | Consolidate color tokens (slate vs gray) | 2-3 hours |
| **LOW** | Add missing `sr-only` labels across all interactive icons | 1 hour |
| **LOW** | Standardize font weights (`font-extrabold` vs `font-black` vs `font-bold`) | 1 hour |

---

## 13. Root Cause

The inconsistencies follow a pattern: **each AI generation session or developer pass produced its own style conventions.** Login and Signup were built together (consistent styling). CreateGig was built in a separate pass (newer pattern with different radii and focus styles). ParticipateGig was built in yet another pass (simpler, less styled).

The `ParticipateGig.tsx` page is the most clearly different — it uses native `border-gray-300`, minimal focus customization, and `font-medium` labels. It looks like an early version that was never updated when the styling convention evolved.

**The fix is not a redesign. It's a standardization pass: pick one input style, one error pattern, one card treatment, and apply it consistently.**
