export class HatpGateway {
  constructor({ baseUrl, apiKey, fetchImpl = globalThis.fetch, allowInsecureHttp = false }) {
    if (!baseUrl) throw new Error("HATP_BASE_URL_REQUIRED");
    if (!apiKey) throw new Error("HATP_API_KEY_REQUIRED");
    if (!fetchImpl) throw new Error("FETCH_IMPLEMENTATION_REQUIRED");
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && !(allowInsecureHttp && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      throw new Error("HATP_HTTPS_REQUIRED");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async authorizePurchase(payload, requestId = crypto.randomUUID()) {
    const response = await this.fetchImpl(`${this.baseUrl}/api/v1/adapters/ap2/authorize`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-hatp-api-key": this.apiKey, "x-request-id": requestId },
      body: JSON.stringify(payload)
    });
    let body;
    try { body = await response.json(); } catch { throw new Error(`HATP_INVALID_JSON_${response.status}`); }
    if (!response.ok) {
      const reason = body?.reason ?? body?.error ?? `HTTP_${response.status}`;
      const error = new Error(`HATP_REQUEST_FAILED:${reason}`);
      error.status = response.status;
      error.details = body;
      throw error;
    }
    if (!body || !["ALLOW", "DENY", "HUMAN_REQUIRED"].includes(body.decision)) throw new Error("HATP_INVALID_DECISION_RESPONSE");
    return body;
  }
}
