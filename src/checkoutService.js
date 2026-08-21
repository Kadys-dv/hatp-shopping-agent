import { findProduct } from "./catalog.js";

export class CheckoutService {
  constructor({ hatp, agentId = "shopping-agent-reference-01", now = () => new Date(), transactionId = () => crypto.randomUUID() }) {
    this.hatp = hatp; this.agentId = agentId; this.now = now; this.transactionId = transactionId; this.executedTransactions = new Set();
  }
  async purchase({ productId, quantity = 1, delegatedAuthorities = ["PURCHASE"], cryptographicallyVerified = true, transactionId }) {
    const product = findProduct(productId);
    if (!product) return { status: "BLOCKED", reason: "PRODUCT_NOT_FOUND" };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return { status: "BLOCKED", reason: "INVALID_QUANTITY" };
    const txId = transactionId ?? this.transactionId();
    if (this.executedTransactions.has(txId)) return { status: "BLOCKED", reason: "LOCAL_REPLAY_BLOCKED", transactionId: txId };
    const amount = Number((product.price * quantity).toFixed(2));
    const expiresAt = new Date(this.now().getTime() + 5 * 60_000).toISOString();
    const payload = {
      agent: { id: this.agentId, did: `did:example:${this.agentId}` },
      mandate: { id: `mandate-${txId}`, status: "VALID", expiresAt, humanPresent: false, delegationDepth: 1, delegatedAuthorities, cryptographicallyVerified },
      transaction: { id: txId, action: "PURCHASE", amount, currency: product.currency },
      merchant: { id: "reference-store", name: "HATP Reference Store" }
    };
    let decision;
    try { decision = await this.hatp.authorizePurchase(payload, `shopping-${txId}`); }
    catch (error) { return { status: "BLOCKED", reason: "HATP_UNAVAILABLE_OR_INVALID", transactionId: txId, error: error.message }; }
    if (decision.decision === "ALLOW") {
      this.executedTransactions.add(txId);
      return { status: "EXECUTED", transactionId: txId, product, quantity, amount, currency: product.currency, hatp: decision };
    }
    if (decision.decision === "HUMAN_REQUIRED") return { status: "PENDING_HUMAN", transactionId: txId, product, quantity, amount, currency: product.currency, hatp: decision };
    return { status: "BLOCKED", transactionId: txId, product, quantity, amount, currency: product.currency, reason: decision.reason, hatp: decision };
  }
}
