import test from "node:test";
import assert from "node:assert/strict";
import { HatpGateway } from "../src/hatpGateway.js";

test("sends AP2 requests through the public HATP adapter", async () => {
  let captured;
  const gateway = new HatpGateway({
    baseUrl: "http://localhost:8080",
    apiKey: "hatp_test_prefix_secret",
    allowInsecureHttp: true,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ decisionId: "d1", decision: "ALLOW", reason: "POLICY_ALLOWED" }), { status: 200 });
    }
  });
  const result = await gateway.authorizePurchase({ transaction: { id: "t1" } }, "req-1");
  assert.equal(captured.url, "http://localhost:8080/api/v1/adapters/ap2/authorize");
  assert.equal(captured.options.headers["x-request-id"], "req-1");
  assert.equal(captured.options.headers["x-hatp-api-key"], "hatp_test_prefix_secret");
  assert.equal(result.decision, "ALLOW");
});

test("uses a separate human verification key for WebAuthn endpoints", async () => {
  let captured;
  const gateway = new HatpGateway({
    baseUrl: "http://localhost:8080",
    apiKey: "runtime-key",
    humanVerifyApiKey: "human-key",
    allowInsecureHttp: true,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ registrationId: "r1", humanAuthorizerId: "h1" }), { status: 200 });
    }
  });
  await gateway.registerPasskeyOptions({ externalSubject: "user-1", displayName: "User" });
  assert.equal(captured.url, "http://localhost:8080/api/v1/webauthn/register/options");
  assert.equal(captured.options.headers["x-hatp-api-key"], "human-key");
});

test("fails closed when a human verification key is not configured", () => {
  const gateway = new HatpGateway({ baseUrl: "http://localhost:8080", apiKey: "runtime-key", allowInsecureHttp: true });
  assert.throws(() => gateway.registerPasskeyOptions({ externalSubject: "x", displayName: "x" }), /HATP_HUMAN_VERIFY_API_KEY_REQUIRED/);
});

test("rejects insecure non-local HATP endpoints", () => {
  assert.throws(() => new HatpGateway({ baseUrl: "http://example.com", apiKey: "x", allowInsecureHttp: true }), /HATP_HTTPS_REQUIRED/);
});

test("rejects malformed authorization responses", async () => {
  const gateway = new HatpGateway({
    baseUrl: "http://localhost:8080",
    apiKey: "x",
    allowInsecureHttp: true,
    fetchImpl: async () => new Response(JSON.stringify({ decision: "MAYBE" }), { status: 200 })
  });
  await assert.rejects(() => gateway.authorizePurchase({}), /HATP_INVALID_DECISION_RESPONSE/);
});
