export class HatpGateway {
  constructor({ baseUrl, apiKey, humanVerifyApiKey, fetchImpl = globalThis.fetch, allowInsecureHttp = false }) {
    if (!baseUrl) throw new Error("HATP_BASE_URL_REQUIRED");
    if (!apiKey) throw new Error("HATP_API_KEY_REQUIRED");
    if (!fetchImpl) throw new Error("FETCH_IMPLEMENTATION_REQUIRED");
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && !(allowInsecureHttp && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      throw new Error("HATP_HTTPS_REQUIRED");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.humanVerifyApiKey = humanVerifyApiKey;
    this.fetchImpl = fetchImpl;
  }

  authorizePurchase(payload, requestId = crypto.randomUUID()) {
    return this.#post("/api/v1/adapters/ap2/authorize", payload, this.apiKey, requestId, true);
  }

  registerPasskeyOptions(payload) {
    return this.#post("/api/v1/webauthn/register/options", payload, this.#humanKey());
  }

  completePasskeyRegistration(payload) {
    return this.#post("/api/v1/webauthn/register/complete", payload, this.#humanKey());
  }

  humanAuthorizationOptions(decisionId, payload) {
    return this.#post(`/api/v1/human-verifications/${encodeURIComponent(decisionId)}/webauthn/options`, payload, this.#humanKey());
  }

  completeHumanAuthorization(decisionId, payload) {
    return this.#post(`/api/v1/human-verifications/${encodeURIComponent(decisionId)}/webauthn/complete`, payload, this.#humanKey());
  }

  #humanKey() {
    if (!this.humanVerifyApiKey) throw new Error("HATP_HUMAN_VERIFY_API_KEY_REQUIRED");
    return this.humanVerifyApiKey;
  }

  async #post(path, payload, apiKey, requestId = crypto.randomUUID(), expectDecision = false) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hatp-api-key": apiKey, "x-request-id": requestId },
      body: JSON.stringify(payload)
    });
    let body;
    try { body = await response.json(); } catch { throw new Error(`HATP_INVALID_JSON_${response.status}`); }
    if (!response.ok) {
      const reason = body?.reason ?? body?.error ?? body?.message ?? `HTTP_${response.status}`;
      const error = new Error(`HATP_REQUEST_FAILED:${reason}`);
      error.status = response.status;
      error.details = body;
      throw error;
    }
    if (expectDecision && (!body || !["ALLOW", "DENY", "HUMAN_REQUIRED"].includes(body.decision))) {
      throw new Error("HATP_INVALID_DECISION_RESPONSE");
    }
    return body;
  }
}
