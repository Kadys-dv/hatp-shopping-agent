import test from "node:test";
import assert from "node:assert/strict";
import { CheckoutService } from "../src/checkoutService.js";

function service(decision) {
  return new CheckoutService({
    hatp: { authorizePurchase: async () => decision },
    now: () => new Date("2026-08-21T03:00:00.000Z"),
    transactionId: () => "tx-001"
  });
}

test("executes only when HATP returns ALLOW", async () => {
  const result = await service({ decisionId: "d1", decision: "ALLOW", reason: "POLICY_ALLOWED" }).purchase({ productId: "kbd-001" });
  assert.equal(result.status, "EXECUTED");
  assert.equal(result.hatp.decision, "ALLOW");
});

test("keeps checkout pending when human verification is required", async () => {
  const result = await service({ decisionId: "d2", decision: "HUMAN_REQUIRED", reason: "AUTONOMOUS_LIMIT_EXCEEDED", requiredVerification: "PASSKEY_FIDO" }).purchase({ productId: "monitor-001" });
  assert.equal(result.status, "PENDING_HUMAN");
});

test("fails closed when HUMAN_REQUIRED is missing decision id", async () => {
  const result = await service({ decision: "HUMAN_REQUIRED", reason: "AUTONOMOUS_LIMIT_EXCEEDED" }).purchase({ productId: "monitor-001" });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, "HATP_HUMAN_DECISION_ID_MISSING");
});

test("executes a pending purchase only after challenge binding and matching approval", async () => {
  const s = service({ decisionId: "d-human", decision: "HUMAN_REQUIRED", reason: "AUTONOMOUS_LIMIT_EXCEEDED" });
  const pending = await s.purchase({ productId: "monitor-001", transactionId: "human-tx" });
  assert.equal(pending.status, "PENDING_HUMAN");
  assert.equal(s.bindHumanChallenge("d-human", "bound-hash").status, "BOUND");
  const completed = s.completeHumanApproval("d-human", { decisionId: "d-human", authorizationId: "auth-1", transactionHash: "bound-hash", status: "APPROVED" });
  assert.equal(completed.status, "EXECUTED");
  assert.equal(completed.transactionId, "human-tx");
});

test("blocks approval before a WebAuthn transaction hash is bound", async () => {
  const s = service({ decisionId: "d-human", decision: "HUMAN_REQUIRED", reason: "AUTONOMOUS_LIMIT_EXCEEDED" });
  await s.purchase({ productId: "monitor-001", transactionId: "human-tx" });
  const completed = s.completeHumanApproval("d-human", { decisionId: "d-human", authorizationId: "auth-1", transactionHash: "bound-hash", status: "APPROVED" });
  assert.equal(completed.status, "BLOCKED");
  assert.equal(completed.reason, "HATP_HUMAN_BINDING_MISSING");
});

test("blocks human approval when transaction hash does not match", async () => {
  const s = service({ decisionId: "d-human", decision: "HUMAN_REQUIRED", reason: "AUTONOMOUS_LIMIT_EXCEEDED" });
  await s.purchase({ productId: "monitor-001", transactionId: "human-tx" });
  s.bindHumanChallenge("d-human", "bound-hash");
  const completed = s.completeHumanApproval("d-human", { decisionId: "d-human", authorizationId: "auth-1", transactionHash: "tampered-hash", status: "APPROVED" });
  assert.equal(completed.status, "BLOCKED");
  assert.equal(completed.reason, "TRANSACTION_BINDING_MISMATCH");
});

test("does not allow a WebAuthn challenge to rebind a pending purchase", async () => {
  const s = service({ decisionId: "d-human", decision: "HUMAN_REQUIRED", reason: "AUTONOMOUS_LIMIT_EXCEEDED" });
  await s.purchase({ productId: "monitor-001", transactionId: "human-tx" });
  assert.equal(s.bindHumanChallenge("d-human", "bound-hash").status, "BOUND");
  const rebound = s.bindHumanChallenge("d-human", "other-hash");
  assert.equal(rebound.status, "BLOCKED");
  assert.equal(rebound.reason, "TRANSACTION_BINDING_MISMATCH");
});

test("fails closed on DENY", async () => {
  const result = await service({ decisionId: "d3", decision: "DENY", reason: "AUTHORITY_ESCALATION" }).purchase({ productId: "mouse-001", delegatedAuthorities: ["READ_CATALOG"] });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, "AUTHORITY_ESCALATION");
});

test("fails closed when HATP is unavailable", async () => {
  const s = new CheckoutService({ hatp: { authorizePurchase: async () => { throw new Error("offline"); } }, transactionId: () => "tx-002" });
  const result = await s.purchase({ productId: "mouse-001" });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, "HATP_UNAVAILABLE_OR_INVALID");
});

test("blocks local replay after an executed transaction", async () => {
  const s = service({ decisionId: "d4", decision: "ALLOW", reason: "POLICY_ALLOWED" });
  const first = await s.purchase({ productId: "kbd-001", transactionId: "same-tx" });
  const replay = await s.purchase({ productId: "kbd-001", transactionId: "same-tx" });
  assert.equal(first.status, "EXECUTED");
  assert.equal(replay.reason, "LOCAL_REPLAY_BLOCKED");
});
