# Architecture Decision Records

## Purpose

Capture every significant technical decision: what was decided, why, what alternatives were considered, and what tradeoffs were accepted.

## Contents

| ADR | Status | Summary |
|---|---|---|
| [ADR-001: Manual Invoicing](ADR-001-manual-invoicing.md) | Accepted | Delaying Stripe/PayU; using manual payment tracking for MVP validation |
| [ADR-002: Corporate CSR Dashboard MVP](ADR-002-corporate-dashboard-mvp.md) | Accepted | Single-tenant, manual-onboarding corporate dashboard with org membership and opt-in privacy model |

## Template

```markdown
# ADR-{NNN}: {Title}

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-{NNN}

## Context
What is the problem or motivation?

## Decision
What was decided?

## Alternatives Considered
| Approach | Pros | Cons |
|---|---|---|
| Option A | ... | ... |
| Option B | ... | ... |

## Consequences
- Positive: ...
- Negative: ...
- Tradeoffs accepted: ...

## Related
- Links to relevant ADRs, code files, or docs
```

## Conventions

- Sequential numbering: `ADR-001-{short-title}.md`
- Status reflects lifecycle, not correctness
- A decision is "Accepted" once implemented
- Superseded decisions link to the replacement
