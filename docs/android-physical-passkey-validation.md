# Android Physical Passkey Validation

This runbook validates the HATP human-authorization path with a real Android device instead of the Chromium virtual authenticator used by CI.

## Evidence classification

Record successful results as **first-party physical-device validation**. This is not an external customer pilot and not production evidence.

## Security requirement

Use HTTPS for the browser-facing Shopping Agent origin. Do not expose development API keys in browser code, tunnel URLs, screenshots, logs, or commits. The Shopping Agent keeps both the runtime `authorize` credential and the `human:verify` credential server-side.

## Topology

```text
Android Chrome
    |
    | HTTPS
    v
Shopping Agent
    |
    | server-to-server
    v
HATP Authority Firewall
    |
    +-- HUMAN_REQUIRED
             |
             v
      WebAuthn challenge
             |
             v
       Android Passkey
             |
             v
          APPROVED
             |
             v
          EXECUTED
```

## Recommended setup

Run HATP and the Shopping Agent on a development computer. Publish only the Shopping Agent through an HTTPS tunnel/reverse proxy. HATP may remain private/local because the Shopping Agent calls it server-to-server.

Let the public Shopping Agent URL be:

```text
https://<shopping-host>
```

Configure HATP WebAuthn using the hostname only as the RP ID:

```text
HATP_WEBAUTHN_RP_ID=<shopping-host>
HATP_WEBAUTHN_ALLOWED_ORIGINS=https://<shopping-host>
```

Do not include `https://` in the RP ID.

Configure the Shopping Agent server with the existing local HATP endpoint and separate credentials:

```text
HATP_BASE_URL=http://localhost:8080
HATP_API_KEY=<authorize-key>
HATP_HUMAN_VERIFY_API_KEY=<human-verify-key>
HATP_ALLOW_INSECURE_HTTP=true
PORT=3000
```

`HATP_ALLOW_INSECURE_HTTP=true` is acceptable here only because this hop is local development traffic. The Android browser must use the HTTPS Shopping Agent URL.

## Device prerequisites

- Android with a screen lock configured.
- Current Chrome browser.
- Passkeys/WebAuthn available on the device.
- The phone can reach the HTTPS Shopping Agent URL.

## Validation procedure

1. Start PostgreSQL and Redis used by the HATP development stack.
2. Start HATP with `HATP_WEBAUTHN_RP_ID` and `HATP_WEBAUTHN_ALLOWED_ORIGINS` matching the HTTPS Shopping Agent hostname.
3. Start the Shopping Agent with the runtime and `human:verify` credentials kept on the server.
4. Publish port 3000 through an HTTPS tunnel/reverse proxy and note the final hostname.
5. Open the HTTPS Shopping Agent URL in Chrome on Android.
6. Select a product whose value exceeds the demo autonomous policy limit (the reference scenario uses BRL 249.90).
7. Submit checkout and confirm the initial result is `HUMAN_REQUIRED`.
8. Start Passkey approval from the pending purchase.
9. When Android presents the credential prompt, create/use the Passkey and confirm with the device screen lock/biometric flow.
10. Confirm HATP returns `APPROVED` and the Shopping Agent transitions the same pending purchase to `EXECUTED`.
11. Confirm the approval is bound to the same HATP `decisionId` and `transactionHash` established for the WebAuthn challenge.
12. Attempt to repeat the completed purchase/approval and confirm replay is blocked.

## PASS criteria

All items must hold:

- Browser origin is HTTPS and matches the configured allowed origin.
- A real Android authenticator completes WebAuthn registration/assertion.
- Initial purchase returns `HUMAN_REQUIRED`.
- HATP approval returns `APPROVED` only after user verification.
- Shopping Agent executes only after matching `decisionId` and `transactionHash`.
- Replay/reuse is rejected.
- No HATP API key appears in browser-visible requests or committed files.

## Result template

```text
Date:
Device model:
Android version:
Browser/version:
Shopping Agent origin:
HATP version/commit:
Shopping Agent version/commit:
Initial decision: HUMAN_REQUIRED / FAIL
Android Passkey prompt: PASS / FAIL
WebAuthn approval: APPROVED / FAIL
Transaction binding: PASS / FAIL
Checkout execution: EXECUTED / FAIL
Replay protection: PASS / FAIL
Notes:
```

Do not commit credential values, biometric information, account identifiers, or private tunnel tokens in the result.
