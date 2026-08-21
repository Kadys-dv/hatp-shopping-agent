import assert from "node:assert/strict";

const baseUrl = process.env.SHOPPING_BASE_URL ?? "http://localhost:3000";

async function purchase(body) {
  const response = await fetch(`${baseUrl}/api/purchase`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

const allow = await purchase({ productId: "cable-001", quantity: 1, transactionId: "e2e-allow-001" });
assert.equal(allow.status, 200, JSON.stringify(allow));
assert.equal(allow.payload.status, "EXECUTED", JSON.stringify(allow));
assert.equal(allow.payload.hatp?.decision, "ALLOW", JSON.stringify(allow));
assert.equal(allow.payload.hatp?.reason, "POLICY_ALLOWED", JSON.stringify(allow));

const human = await purchase({ productId: "kbd-001", quantity: 1, transactionId: "e2e-human-001" });
assert.equal(human.status, 202, JSON.stringify(human));
assert.equal(human.payload.status, "PENDING_HUMAN", JSON.stringify(human));
assert.equal(human.payload.hatp?.decision, "HUMAN_REQUIRED", JSON.stringify(human));
assert.equal(human.payload.hatp?.reason, "AUTONOMOUS_LIMIT_EXCEEDED", JSON.stringify(human));

const deny = await purchase({
  productId: "cable-001",
  quantity: 1,
  delegatedAuthorities: ["REFUND"],
  transactionId: "e2e-deny-001"
});
assert.equal(deny.status, 403, JSON.stringify(deny));
assert.equal(deny.payload.status, "BLOCKED", JSON.stringify(deny));
assert.equal(deny.payload.hatp?.decision, "DENY", JSON.stringify(deny));
assert.equal(deny.payload.hatp?.reason, "AUTHORITY_ESCALATION", JSON.stringify(deny));

const replay = await purchase({ productId: "cable-001", quantity: 1, transactionId: "e2e-allow-001" });
assert.equal(replay.status, 403, JSON.stringify(replay));
assert.equal(replay.payload.reason, "LOCAL_REPLAY_BLOCKED", JSON.stringify(replay));

console.log(JSON.stringify({
  result: "PASS",
  scenarios: {
    allow: { decision: allow.payload.hatp.decision, reason: allow.payload.hatp.reason },
    humanRequired: { decision: human.payload.hatp.decision, reason: human.payload.hatp.reason },
    deny: { decision: deny.payload.hatp.decision, reason: deny.payload.hatp.reason },
    replay: { status: replay.payload.status, reason: replay.payload.reason }
  }
}, null, 2));
