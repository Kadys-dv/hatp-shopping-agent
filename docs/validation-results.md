# First-party validation results

This document records reference-integration evidence only. It must not be presented as external customer or production traffic.

## End-to-end validation — 2026-08-21

The automated E2E flow started a real HATP instance backed by PostgreSQL and Redis, started this Shopping Agent as an independent HTTP client, and executed the scenarios below.

| Scenario | Result |
| --- | --- |
| USB-C Cable, BRL 39.90 | `ALLOW / POLICY_ALLOWED` |
| Mechanical Keyboard, BRL 249.90 | `HUMAN_REQUIRED / AUTONOMOUS_LIMIT_EXCEEDED` |
| Purchase without delegated `PURCHASE` authority | `DENY / AUTHORITY_ESCALATION` |
| Reuse of an already executed local transaction id | `BLOCKED / LOCAL_REPLAY_BLOCKED` |

**Result: PASS**

The same CI run also executed the Shopping Agent unit/reference suite: **8 passed, 0 failed**. The HATP repository's normal backend, SDK, dashboard and Partner Simulator CI job also completed successfully during this validation.

## Evidence status

- Unit/reference tests: passing.
- Independent HTTP integration through the public HATP AP2 adapter: passing.
- Live HATP + PostgreSQL + Redis E2E: passing.
- External pilot evidence: not yet collected.

This is **first-party validation**. Do not convert these test counts into customer-usage or production claims.
