# Refactors

## Purpose

Plans and records for codebase refactors: what changed, why, before/after analysis, migration notes.

## Contents

- `refactor-priority-matrix.md` — Full P0-P3 inventory (51 items) with impact, effort, execution order, risk analysis

### Completed Refactors

| ID | Title | Date |
|---|---|---|
| P0-1 | [Fix cachedToken race condition](./P0-1-cached-token-race-condition.md) | 2026-05-25 |
| P0-2 | [Replace CDN confetti with npm package](./P0-2-cdn-confetti-to-npm.md) | 2026-05-25 |
| P0-3 | [Stub client on missing env instead of crash](./P0-3-stub-client-on-missing-env.md) | 2026-05-25 |
| P0-4 | [Add SET search_path to SECURITY DEFINER functions](./P0-4-db-search-path-security.md) | 2026-05-25 |
| P0-5 | [Verify featureGig 403 propagation](./P0-5-featuregig-403-verification.md) | 2026-05-25 |
| P0-6 | [Fix stale volunteers_joined counter](./P0-6-stale-volunteers-joined-counter.md) | 2026-05-25 |
| P0-7 | [Add rate limiting](./P0-7-rate-limiting.md) | 2026-05-25 |
| P0-8 | [Add CSP headers](./P0-8-csp-headers.md) | 2026-05-25 |
| P0-9 | [Remove orphaned DeepSeek key](./P0-9-remove-orphaned-deepseek-key.md) | 2026-05-25 |
| P1   | [All P1 refactors (16 items, batched)](./P1-completed-refactors.md) | 2026-05-25 |
| P2   | [All P2 refactors (15 items, batched)](./P2-completed-refactors.md) | 2026-05-25 |
| P3   | [All P3 refactors (5 items evaluated)](./P3-completed-refactors.md) | 2026-05-25 |

## Template

```markdown
# Refactor: {Title}

**Date:** YYYY-MM-DD
**Status:** Planned | In Progress | Complete | Rolled Back

## Motivation
{Why is this refactor needed? What problem does it solve?}

## Scope
{Which files, modules, or components are affected?}

## Before
{Description of current state — code patterns, issues, complexity}

## After
{Description of desired state — simplified, extracted, consolidated}

## Migration Plan
1. Step 1
2. Step 2
3. ...

## Regression Risks
{What could break? How is it mitigated?}

## Verification
{Tests, manual checks, rollout plan}
```

## Conventions

- One refactor per file unless changes are tightly coupled
- Always document the "why" — refactors without justification are waste
- Include verification steps before considering it complete
