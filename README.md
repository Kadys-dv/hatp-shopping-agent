# HATP Shopping Agent

First-party reference integration for the HATP Authority Firewall.

This repository demonstrates how an external shopping application can integrate with HATP exclusively through its public AP2 authorization API. It does not import internal HATP classes.

> Validation status: first-party reference integration. This is not an external customer pilot and does not represent production evidence.

## Goal

Validate the integration experience and enforcement behavior of HATP from the perspective of an independent client application.

Core scenarios:

- `ALLOW` -> simulated purchase executes.
- `DENY` -> purchase is blocked.
- `HUMAN_REQUIRED` -> purchase remains pending for human verification.
- HATP unavailable or malformed response -> fail closed.
- Local replay of the same transaction -> blocked.

## Architecture

```text
User
  |
  v
Shopping Agent
  |
  v
Checkout Service
  |
  v
HATP Gateway -- AP2 --> HATP Authority Firewall
  |
  +-- ALLOW ----------> simulated purchase
  +-- DENY -----------> blocked
  +-- HUMAN_REQUIRED -> pending human verification
```

## Public AP2 contract

The client sends the public HATP AP2 shape:

```json
{
  "agent": { "id": "shopping-agent-01", "did": "did:example:shopping-agent-01" },
  "mandate": {
    "id": "mandate-demo",
    "status": "VALID",
    "expiresAt": "2026-12-31T23:59:59Z",
    "humanPresent": false,
    "delegationDepth": 1,
    "delegatedAuthorities": ["PURCHASE"],
    "cryptographicallyVerified": true
  },
  "transaction": {
    "id": "intent-...",
    "action": "PURCHASE",
    "amount": 199.90,
    "currency": "BRL"
  },
  "merchant": { "id": "demo-store", "name": "HATP Demo Store" }
}
```

## Run

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
npm test
npm start
```

Open `http://localhost:3000`.

For local HATP over HTTP, keep `HATP_ALLOW_INSECURE_HTTP=true`. Never enable insecure HTTP for a remote HATP endpoint.

## Environment

```text
PORT=3000
HATP_BASE_URL=http://localhost:8080
HATP_API_KEY=replace-with-test-api-key
HATP_ALLOW_INSECURE_HTTP=true
SHOPPING_AGENT_ID=shopping-agent-01
SHOPPING_AGENT_DID=did:example:shopping-agent-01
HATP_MANDATE_ID=shopping-demo-mandate
HATP_MANDATE_EXPIRES_AT=2026-12-31T23:59:59Z
```

## Validation evidence

Results produced by this repository must be described as **first-party validation**, not customer validation. External pilots should be tracked separately so simulated/reference results are never presented as real customer traffic.

## Relationship to HATP

HATP is an independent project. This repository intentionally consumes only its public API so integration friction, contract problems, error handling and operational behavior can be discovered before external pilots.
