# Render deployment — Android physical Passkey test

This repository is the browser-facing reference client for first-party physical-device validation.

## Render Web Service

Deploy as a free Docker Web Service from `Kadys-dv/hatp-shopping-agent`.

Environment variables:

```text
HATP_BASE_URL=https://<hatp-service-hostname>
HATP_API_KEY=<authorize-key>
HATP_HUMAN_VERIFY_API_KEY=<human-verify-key>
HATP_ALLOW_INSECURE_HTTP=false
SHOPPING_AGENT_ID=shopping-agent-physical-test-01
```

Never commit the HATP keys and never expose them to browser JavaScript.

## HATP WebAuthn configuration

If this service is deployed at:

```text
https://hatp-shopping-agent-test.onrender.com
```

configure HATP with:

```text
HATP_WEBAUTHN_RP_ID=hatp-shopping-agent-test.onrender.com
HATP_WEBAUTHN_ALLOWED_ORIGINS=https://hatp-shopping-agent-test.onrender.com
HATP_CORS_ALLOWED_ORIGINS=https://hatp-shopping-agent-test.onrender.com
```

The exact Render hostname must be used.

## Android validation

Open the HTTPS URL in Android Chrome, register a Passkey, trigger a purchase above the autonomous limit, and approve the pending operation with the device authenticator. A PASS requires `APPROVED` and `EXECUTED` only after the bound `decisionId` and `transactionHash` match.
