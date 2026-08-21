import { findProduct } from "./catalog.js";

export class CheckoutService {
  constructor({ hatp, agentId = "shopping-agent-reference-01", now = () => new Date(), transactionId = () => crypto.randomUUID() }) {
    this.hatp = hatp;
    this.agentId = agentId;
    this.now = now;
    this.transactionId = transactionId;
    this.executedTransactions = new Set();
    this.pendingByDecision = new Map();
  }

  async purchase({ productId, quantity = 1, delegatedAuthorities = ["PURCHASE"], cryptographicallyVerified = true, transactionId }) {
    const product = findProduct(productId);
    if (!product) return { status: "BLOCKED", reason: "PRODUCT_NOT_FOUND" };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return { status: "BLOCKED", reason: "INVALID_QUANTITY" };
    const txId = transactionId ?? this.transactionId();
    if (this.executedTransactions.has(txId)) return { status: "BLOCKED", reason: "LOCAL_REPLAY_BLOCKED", transactionId: txId };
    if ([...this.pendingByDecision.values()].some((pending) => pending.transactionId === txId)) {
      return { status: "BLOCKED", reason: "LOCAL_PENDING_REPLAY_BLOCKED", transactionId: txId };
    }

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

    const purchase = { transactionId: txId, product, quantity, amount, currency: product.currency };
    if (decision.decision === "ALLOW") {
      this.executedTransactions.add(txId);
      return { status: "EXECUTED", ...purchase, hatp: decision };
    }
    if (decision.decision === "HUMAN_REQUIRED") {
      if (!decision.decisionId) return { status: "BLOCKED", reason: "HATP_HUMAN_DECISION_ID_MISSING", ...purchase, hatp: decision };
      this.pendingByDecision.set(decision.decisionId, { ...purchase, transactionHash: null });
      return { status: "PENDING_HUMAN", ...purchase, hatp: decision };
    }
    return { status: "BLOCKED", ...purchase, reason: decision.reason, hatp: decision };
  }

  bindHumanChallenge(decisionId, transactionHash) {
    const pending = this.pendingByDecision.get(decisionId);
    if (!pending) return { status: "BLOCKED", reason: "PENDING_PURCHASE_NOT_FOUND", decisionId };
    if (!transactionHash) return { status: "BLOCKED", reason: "HATP_HUMAN_BINDING_MISSING", decisionId };
    if (pending.transactionHash && pending.transactionHash !== transactionHash) {
      return { status: "BLOCKED", reason: "TRANSACTION_BINDING_MISMATCH", decisionId };
    }
    pending.transactionHash = transactionHash;
    this.pendingByDecision.set(decisionId, pending);
    return { status: "BOUND", decisionId, transactionHash };
  }

  completeHumanApproval(decisionId, completion) {
    const pending = this.pendingByDecision.get(decisionId);
    if (!pending) return { status: "BLOCKED", reason: "PENDING_PURCHASE_NOT_FOUND", decisionId };
    if (!pending.transactionHash) return { status: "BLOCKED", reason: "HATP_HUMAN_BINDING_MISSING", decisionId };
    if (!completion || completion.status !== "APPROVED" || completion.decisionId !== decisionId) {
      return { status: "BLOCKED", reason: "INVALID_HUMAN_APPROVAL", decisionId };
    }
    if (!completion.transactionHash || completion.transactionHash !== pending.transactionHash) {
      return { status: "BLOCKED", reason: "TRANSACTION_BINDING_MISMATCH", decisionId };
    }
    if (this.executedTransactions.has(pending.transactionId)) {
      this.pendingByDecision.delete(decisionId);
      return { status: "BLOCKED", reason: "LOCAL_REPLAY_BLOCKED", transactionId: pending.transactionId, decisionId };
    }
    this.executedTransactions.add(pending.transactionId);
    this.pendingByDecision.delete(decisionId);
    return { status: "EXECUTED", ...pending, decisionId, authorizationId: completion.authorizationId, humanVerification: completion };
  }
}
