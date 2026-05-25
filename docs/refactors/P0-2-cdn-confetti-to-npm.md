# Refactor: P0-2 — Replace CDN canvas-confetti with npm package

**Date:** 2026-05-25
**Status:** Complete

## Motivation

Three call sites loaded `canvas-confetti` via CDN dynamic imports (no SRI) instead of a static npm import. This:
- Blocks offline PWA usage (no cache control)
- Adds network round-trip latency at celebration time
- Has no SRI integrity protection
- Requires `@ts-ignore` annotations and handling the `.default || module` pattern

## Scope

- `frontend/src/pages/ParticipateGig.tsx` (1 call site)
- `frontend/src/pages/VolunteerPortfolio.tsx` (2 call sites)
- `frontend/package.json` (added dependency)

## Before

```ts
// ParticipateGig.tsx — dynamic CDN import
const module = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm');
const confetti = module.default || module;

// VolunteerPortfolio.tsx — two dynamic CDN imports with @ts-ignore
// @ts-ignore
const module = await import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm');
```

## After

```ts
import confetti from 'canvas-confetti';

// Direct call — no try/catch needed for the import itself
confetti({ particleCount: 150, ... });
```

## Migration Plan

1. `npm install canvas-confetti@^1.9.3`
2. Added `import confetti from 'canvas-confetti'` to both files
3. Replaced 3 CDN `import()` calls with direct `confetti()` calls
4. Removed 2 `@ts-ignore` annotations
5. Kept existing try/catch in ParticipateGig (catches potential confetti API errors, not import errors)

## Regression Risks

- Confetti API unchanged (same package, same version) — zero behavioral difference.
- The try/catch around confetti in ParticipateGig is preserved for safety.

## Verification

- Frontend builds without errors (`npx vite build`)
- Frontend test suite: 36/36
