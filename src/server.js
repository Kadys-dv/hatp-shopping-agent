import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { catalog } from "./catalog.js";
import { HatpGateway } from "./hatpGateway.js";
import { CheckoutService } from "./checkoutService.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const port = Number(process.env.PORT ?? 3000);
const hatp = new HatpGateway({
  baseUrl: process.env.HATP_BASE_URL ?? "http://localhost:8080",
  apiKey: process.env.HATP_API_KEY ?? "hatp_test_REPLACE_ME",
  humanVerifyApiKey: process.env.HATP_HUMAN_VERIFY_API_KEY,
  allowInsecureHttp: (process.env.HATP_ALLOW_INSECURE_HTTP ?? "true") === "true"
});
const checkout = new CheckoutService({ hatp, agentId: process.env.SHOPPING_AGENT_ID ?? "shopping-agent-reference-01" });
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
  }
  return raw ? JSON.parse(raw) : {};
}
function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}
function decisionIdFrom(pathname, suffix) {
  const prefix = "/api/human-verifications/";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null;
  const value = pathname.slice(prefix.length, -suffix.length);
  return value && !value.includes("/") ? decodeURIComponent(value) : null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "GET" && url.pathname === "/api/catalog") return send(res, 200, catalog);
    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { status: "UP", humanVerificationConfigured: Boolean(process.env.HATP_HUMAN_VERIFY_API_KEY) });

    if (req.method === "POST" && url.pathname === "/api/purchase") {
      const result = await checkout.purchase(await readJson(req));
      return send(res, result.status === "EXECUTED" ? 200 : result.status === "PENDING_HUMAN" ? 202 : 403, result);
    }
    if (req.method === "POST" && url.pathname === "/api/webauthn/register/options") {
      return send(res, 200, await hatp.registerPasskeyOptions(await readJson(req)));
    }
    if (req.method === "POST" && url.pathname === "/api/webauthn/register/complete") {
      return send(res, 200, await hatp.completePasskeyRegistration(await readJson(req)));
    }

    const optionsDecisionId = decisionIdFrom(url.pathname, "/webauthn/options");
    if (req.method === "POST" && optionsDecisionId) {
      return send(res, 200, await hatp.humanAuthorizationOptions(optionsDecisionId, await readJson(req)));
    }
    const completeDecisionId = decisionIdFrom(url.pathname, "/webauthn/complete");
    if (req.method === "POST" && completeDecisionId) {
      const completion = await hatp.completeHumanAuthorization(completeDecisionId, await readJson(req));
      const result = checkout.completeHumanApproval(completeDecisionId, completion);
      return send(res, result.status === "EXECUTED" ? 200 : 409, result);
    }

    if (req.method !== "GET") return send(res, 404, { error: "NOT_FOUND" });
    const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (relative.includes("..")) return send(res, 400, { error: "INVALID_PATH" });
    const path = join(root, relative);
    const data = await readFile(path);
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream", "x-content-type-options": "nosniff" });
    res.end(data);
  } catch (error) {
    const status = error.message === "PAYLOAD_TOO_LARGE" ? 413 : Number(error.status) || 500;
    send(res, status, { error: error.message ?? "INTERNAL_ERROR", details: error.details });
  }
});
server.listen(port, () => console.log(`HATP Shopping Agent listening on http://localhost:${port}`));
