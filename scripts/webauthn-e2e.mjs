import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.SHOPPING_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true
    }
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#registerPasskey").click();
  await page.waitForFunction(() => document.querySelector("#passkeyStatus")?.textContent?.includes("Passkey registered:"));
  const authorizer = await page.locator("#passkeyStatus").textContent();
  assert.match(authorizer ?? "", /Passkey registered:/);

  await page.locator("#product").selectOption("kbd-001");
  await page.locator("#quantity").fill("1");
  await page.locator("#buy").click();
  await page.waitForFunction(() => document.querySelector("#result")?.textContent?.includes('"PENDING_HUMAN"'));
  const pending = JSON.parse(await page.locator("#result").textContent());
  assert.equal(pending.status, "PENDING_HUMAN");
  assert.equal(pending.hatp.decision, "HUMAN_REQUIRED");
  assert.equal(pending.hatp.reason, "AUTONOMOUS_LIMIT_EXCEEDED");
  assert.ok(pending.hatp.decisionId, "HATP must return decisionId for human verification");

  await page.locator("#approve").click();
  await page.waitForFunction(() => document.querySelector("#result")?.textContent?.includes('"EXECUTED"'));
  const completed = JSON.parse(await page.locator("#result").textContent());
  assert.equal(completed.status, "EXECUTED");
  assert.equal(completed.humanVerification.status, "APPROVED");
  assert.equal(completed.humanVerification.decisionId, pending.hatp.decisionId);
  assert.ok(completed.humanVerification.transactionHash, "WebAuthn completion must return the bound transaction hash");
  assert.equal(completed.transactionHash, completed.humanVerification.transactionHash);

  console.log(JSON.stringify({
    result: "PASS",
    flow: "HUMAN_REQUIRED -> WebAuthn challenge binding -> Passkey -> APPROVED -> EXECUTED",
    decisionId: completed.humanVerification.decisionId,
    transactionHashBound: true,
    virtualAuthenticator: authenticatorId
  }, null, 2));
} finally {
  await browser.close();
}
