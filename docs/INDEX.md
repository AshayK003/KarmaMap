# KarmaMap — Project Governance

Local project memory. All architecture decisions, reviews, bugs, refactors, flows, and deployment context lives here.

## Structure

| Folder | Purpose |
|---|---|
| `architecture/` | System architecture, component diagrams, data models |
| `decisions/` | Architecture Decision Records (ADRs) — what was decided and why |
| `reviews/` | Code review records, audit reports, review-driven change logs |
| `bugs/` | Bug reports with reproduction steps, root cause, resolution |
| `refactors/` | Refactoring plans, before/after analysis, migration notes |
| `flows/` | Data flow diagrams, process workflows, user journey maps |
| `deployment/` | Deployment runbooks, environment configs, operational guides |

## Existing Reference Docs

- [testing-strategy.md](./testing-strategy.md) — Test pyramid, 75-test plan, sprint breakdown
- [deployment.md](./deployment.md) — Docker Compose + Caddy + VPS deploy guide
- [recommendations.md](./recommendations.md) — Full audit with prioritized fixes
- [tool-recommendations.md](./tool-recommendations.md) — Curated OSS tool recommendations

## Conventions

- All governance documents are plain Markdown (`.md`)
- Dates use ISO 8601: `YYYY-MM-DD`
- ADRs follow the MADR template (see `decisions/INDEX.md`)
- Bug reports follow the template in `bugs/INDEX.md`
- Refactor plans follow the template in `refactors/INDEX.md`
- Keep entries concise. One file per topic/decision/bug/refactor.
- Link between documents when they reference each other.
