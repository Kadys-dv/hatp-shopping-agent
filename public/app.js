import { createPasskey, getPasskeyAssertion } from "./webauthn.js";

const product = document.querySelector("#product");
const quantity = document.querySelector("#quantity");
const verified = document.querySelector("#verified");
const authority = document.querySelector("#authority");
const result = document.querySelector("#result");
const buy = document.querySelector("#buy");
const approve = document.querySelector("#approve");
const registerPasskey = document.querySelector("#registerPasskey");
const displayName = document.querySelector("#displayName");
const passkeyStatus = document.querySelector("#passkeyStatus");

let pendingDecisionId = null;
let humanAuthorizerId = localStorage.getItem("hatpHumanAuthorizerId");
if (humanAuthorizerId) passkeyStatus.textContent = `Passkey authorizer ready: ${humanAuthorizerId}`;

async function post(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `HTTP_${response.status}`);
  return payload;
}

function show(value) { result.textContent = JSON.stringify(value, null, 2); }

const catalog = await fetch("/api/catalog").then((response) => response.json());
for (const item of catalog) {
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = `${item.name} — ${item.price.toLocaleString("pt-BR", { style: "currency", currency: item.currency })}`;
  product.append(option);
}

registerPasskey.addEventListener("click", async () => {
  registerPasskey.disabled = true;
  try {
    const subject = `shopping-demo-${crypto.randomUUID()}`;
    const options = await post("/api/webauthn/register/options", { externalSubject: subject, displayName: displayName.value || "Demo Approver" });
    const credential = await createPasskey(options);
    const completed = await post("/api/webauthn/register/complete", { registrationId: options.registrationId, credential });
    humanAuthorizerId = completed.humanAuthorizerId ?? options.humanAuthorizerId;
    localStorage.setItem("hatpHumanAuthorizerId", humanAuthorizerId);
    passkeyStatus.textContent = `Passkey registered: ${humanAuthorizerId}`;
    show(completed);
  } catch (error) {
    show({ status: "BLOCKED", error: error.message });
  } finally {
    registerPasskey.disabled = false;
  }
});

buy.addEventListener("click", async () => {
  buy.disabled = true;
  approve.hidden = true;
  pendingDecisionId = null;
  result.textContent = "Calling HATP…";
  try {
    const body = await post("/api/purchase", {
      productId: product.value,
      quantity: Number(quantity.value),
      delegatedAuthorities: authority.checked ? ["PURCHASE"] : ["READ_CATALOG"],
      cryptographicallyVerified: verified.checked
    });
    show(body);
    if (body.status === "PENDING_HUMAN") {
      pendingDecisionId = body.hatp?.decisionId;
      approve.hidden = !pendingDecisionId;
    }
  } catch (error) {
    show({ status: "BLOCKED", error: error.message });
  } finally {
    buy.disabled = false;
  }
});

approve.addEventListener("click", async () => {
  if (!pendingDecisionId) return show({ status: "BLOCKED", reason: "NO_PENDING_DECISION" });
  if (!humanAuthorizerId) return show({ status: "BLOCKED", reason: "REGISTER_PASSKEY_FIRST" });
  approve.disabled = true;
  try {
    const options = await post(`/api/human-verifications/${encodeURIComponent(pendingDecisionId)}/webauthn/options`, { humanAuthorizerId });
    const credential = await getPasskeyAssertion(options);
    const completed = await post(`/api/human-verifications/${encodeURIComponent(pendingDecisionId)}/webauthn/complete`, {
      webauthnChallengeId: options.webauthnChallengeId,
      credential
    });
    show(completed);
    if (completed.status === "EXECUTED") {
      pendingDecisionId = null;
      approve.hidden = true;
    }
  } catch (error) {
    show({ status: "BLOCKED", error: error.message });
  } finally {
    approve.disabled = false;
  }
});
