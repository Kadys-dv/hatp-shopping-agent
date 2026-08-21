# Validation plan

This repository is a **first-party reference integration**, not an external customer pilot.

## Scenarios

1. `ALLOW`: purchase within the configured autonomous policy limit executes.
2. `HUMAN_REQUIRED`: purchase above the autonomous limit remains pending; no purchase is executed by this reference client.
3. `DENY`: missing delegated `PURCHASE` authority is blocked.
4. AP2 verification downgrade: `cryptographicallyVerified=false` must fail closed.
5. HATP outage or malformed response: checkout fails closed.
6. Replay: a transaction already executed by this client cannot be executed again with the same transaction ID.

## Metrics to collect during real runs

- total authorization calls
- ALLOW / DENY / HUMAN_REQUIRED ratio
- reason distribution
- HATP round-trip latency p50 / p95 / p99
- integration errors
- false-positive / false-negative feedback during external pilots

## Evidence labels

- Automated test: local deterministic test.
- First-party integration: this repository talking to HATP over the public API.
- External pilot: independent partner integration. Do not label first-party results as external-pilot evidence.
