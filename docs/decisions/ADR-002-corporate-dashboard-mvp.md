# ADR-002: Corporate CSR Dashboard MVP

**Date:** 2026-05-25
**Status:** Accepted

## Context

KarmaMap's monetization analysis identified corporate CSR dashboards as one of three highest-value plays. Companies want to track volunteer hours, departmental participation, and impact metrics for their employees — but the platform had no way to group volunteers into organizations.

Building a full multi-tenant, self-serve onboarding system was premature. The goal was to validate willingness-to-pay with a single-tenant, manually-onboarded MVP.

## Decision

Build a corporate CSR dashboard as a single-tenant, manual-onboarding MVP with two new database tables (`organizations`, `organization_members`) and Express backend endpoints, plus React frontend pages. Key design choices:

1. **Organization membership** via `organization_members` table — not a new `user_role` enum value — keeps auth middleware unchanged
2. **Admin role** tracked via `organization_members.role = 'admin'`, checked in service functions only
3. **Privacy opt-in**: volunteers must set `opted_in = true` before their data appears in company analytics; opt-in is reversible
4. **Analytics computed server-side** by joining across `organization_members`, `participations`, `gigs`, and `profiles` tables — no migration of existing participation data needed
5. **CSV export generated browser-side** from analytics data; PDF deferred to post-MVP
6. **Missing table detection**: services use `requireTables()` helper to catch `PGRST202` errors and return 503 with a clear message instead of a generic 500

## Alternatives Considered

| Approach | Pros | Cons |
|---|---|---|
| **Manual org membership + opt-in (chosen)** | No auth middleware changes, privacy-first, 1 week build | Requires manual onboarding, no self-serve signup |
| **Multi-tenant with self-serve onboarding** | Scales without admin intervention | 2-3 weeks build, premature for MVP validation |
| **New `user_role` enum value 'corporate_admin'** | Cleaner role semantics | Requires changes to auth middleware, verifyJwt, all role guards |

## Consequences

- **Positive:** Corporate features are fully gated by the `organizations` + `organization_members` tables — opt-out is clean (drop both tables).
- **Positive:** Privacy model is explicit: no volunteer data is exposed to company analytics without opt-in.
- **Positive:** Analytics leverage existing participation data — no new data collection needed.
- **Negative:** Manual onboarding doesn't scale — admin must run SQL to add new companies and members.
- **Negative:** Single-tenant design means all organization members share the same org; no multi-company isolation yet.
- **Tradeoff accepted:** Self-serve onboarding and multi-tenancy deferred until willingness-to-pay is validated.

## Implementation

- One new migration: `10_corporate_dashboard.sql` (organizations + organization_members tables + RLS + indexes)
- New backend files: `organizationService.ts`, `organizationController.ts`, `routes/organizations.ts`
- New frontend pages: `CorporateDashboard.tsx` (stats + charts + CSV), `OrganizationManage.tsx` (admin member management)
- Modified frontend: `App.tsx` (2 new routes), `Navbar.tsx` (nav links), `NavIcons.tsx` (Building2Icon, UsersIcon, ClockIcon), `VolunteerPortfolio.tsx` (org info + opt-in toggle), `database.ts` (Org types), `api.ts` (fallback fetch logic), `index.html` (CSP connect-src)
- Bootstrap script: `backend/scripts/applyMigration.ts` (attempts direct DB + pooler connections to auto-apply migration)
- Tests: `organizationService.test.ts` (13 unit tests), existing `api.test.ts` updated (21 integration tests)

## Related

- Migration: `supabase/migrations/10_corporate_dashboard.sql`
- Service: `backend/services/organizationService.ts`
- Controller: `backend/controllers/organizationController.ts`
- Routes: `backend/routes/organizations.ts`
- Script: `backend/scripts/applyMigration.ts`
