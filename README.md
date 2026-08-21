# HATP Shopping Agent

First-party reference integration for the HATP Authority Firewall.

This repository demonstrates how an external shopping application can integrate with HATP exclusively through public HATP APIs. It does not import internal HATP classes.

> Validation status: first-party reference integration. This is not an external customer pilot and does not represent production evidence.

## Goal

Validate the integration experience and enforcement behavior of HATP from the perspective of an independent client application.

Core scenarios:

- `ALLOW` -> simulated purchase executes.
- `DENY` -> purchase is blocked.
- `HUMAN_REQUIRED` -> purchase remains pending and can be approved with a Passkey/WebAuthn.
- Human approval must return the same HATP `decisionId` and `transactionHash` before checkout executes.
- HATP unavailable or malformed response -> fail closed.
- Local replay of an executed or pending transaction -> blocked.

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
  +-- HUMAN_REQUIRED
             |
             v
       Passkey/WebAuthn
             |
             v
   transactionHash check
             |
             v
      simulated purchase
```

The runtime authorization key and the `human:verify` key are separate server-side credentials. Neither is sent to the browser.

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
    "id": "intent-001",
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

To use the Passkey flow, the HATP WebAuthn allowed origins must include the Shopping Agent origin, for example `http://localhost:3000` in local development.

## Environment

```text
PORT=3000
HATP_BASE_URL=http://localhost:8080
HATP_API_KEY=replace-with-authorize-api-key
HATP_HUMAN_VERIFY_API_KEY=replace-with-human-verify-api-key
HATP_ALLOW_INSECURE_HTTP=true
SHOPPING_AGENT_ID=shopping-agent-01
```

## Validation evidence

Results produced by this repository must be described as **first-party validation**, not customer validation. External pilots should be tracked separately so simulated/reference results are never presented as real customer traffic.

The browser E2E uses a Chromium virtual authenticator to exercise the actual WebAuthn registration/assertion flow against HATP. See `docs/validation-results.md` for recorded results.

## Relationship to HATP

HATP is an independent project. This repository intentionally consumes only public HATP APIs so integration friction, contract problems, error handling and operational behavior can be discovered before external pilots.
