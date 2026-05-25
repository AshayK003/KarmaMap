# Architecture Decision Records

## Purpose

Capture every significant technical decision: what was decided, why, what alternatives were considered, and what tradeoffs were accepted.

## Contents

*(Add entries here as files are created)*

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
