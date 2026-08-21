# First-party validation results

This document records reference-integration evidence only. It must not be presented as external customer or production traffic.

## Authorization E2E — 2026-08-21

A real HATP instance backed by PostgreSQL and Redis was started, then this Shopping Agent ran as an independent HTTP client through the public AP2 adapter.

| Scenario | Result |
| --- | --- |
| USB-C Cable, BRL 39.90 | `ALLOW / POLICY_ALLOWED` |
| Mechanical Keyboard, BRL 249.90 | `HUMAN_REQUIRED / AUTONOMOUS_LIMIT_EXCEEDED` |
| Purchase without delegated `PURCHASE` authority | `DENY / AUTHORITY_ESCALATION` |
| Reuse of an already executed local transaction id | `BLOCKED / LOCAL_REPLAY_BLOCKED` |

**Result: PASS**

## Passkey/WebAuthn E2E — 2026-08-21

The HATP stack was again executed with PostgreSQL and Redis. A headless Chromium browser used a CTAP2 virtual authenticator to exercise the actual WebAuthn browser APIs and the public HATP human-verification endpoints.

Validated flow:

```text
PURCHASE above autonomous limit
        ↓
HUMAN_REQUIRED
        ↓
WebAuthn options from HATP
        ↓
transactionHash bound to pending checkout
        ↓
Passkey assertion
        ↓
HATP APPROVED
        ↓
matching decisionId + transactionHash
        ↓
EXECUTED
```

Observed result:

- Passkey registration: passed.
- `HUMAN_REQUIRED`: passed.
- WebAuthn challenge creation: passed.
- Transaction hash binding: passed.
- Passkey assertion verification: passed.
- HATP human approval: passed.
- Checkout executed only after matching approval: passed.
- Unit/reference suite after binding changes: **15 passed, 0 failed**.

**Result: PASS**

The browser run used a Chromium virtual authenticator. This validates protocol/application integration, not a physical-device usability test and not an external customer pilot.

## Evidence status

- Unit/reference tests: passing.
- Independent HTTP integration through the public HATP AP2 adapter: passing.
- Live HATP + PostgreSQL + Redis E2E: passing.
- Browser WebAuthn + transaction-binding E2E: passing with a virtual authenticator.
- Physical Passkey device validation: not yet recorded here.
- External pilot evidence: not yet collected.

This is **first-party validation**. Do not convert these test counts into customer-usage or production claims.
