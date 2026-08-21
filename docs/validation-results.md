# First-party validation results

This document records reference-integration evidence only. It must not be presented as external customer or production traffic.

## End-to-end target

The automated E2E flow starts a real HATP instance backed by PostgreSQL and Redis, starts this Shopping Agent as an independent HTTP client, and verifies:

| Scenario | Expected result |
| --- | --- |
| USB-C Cable, BRL 39.90 | `ALLOW / POLICY_ALLOWED` |
| Mechanical Keyboard, BRL 249.90 | `HUMAN_REQUIRED / AUTONOMOUS_LIMIT_EXCEEDED` |
| Purchase without delegated `PURCHASE` authority | `DENY / AUTHORITY_ESCALATION` |
| Reuse of an already executed local transaction id | `BLOCKED / LOCAL_REPLAY_BLOCKED` |

## Evidence status

- Unit/reference tests: implemented.
- Live HATP E2E: executed by the HATP repository integration workflow.
- External pilot evidence: not yet collected.

Do not convert first-party test counts into customer-usage claims.
