function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return bytes.buffer;
}

function toBase64Url(value) {
  if (value == null) return null;
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function descriptor(item) {
  return { ...item, id: fromBase64Url(item.id) };
}

export async function createPasskey(options) {
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("WEBAUTHN_UNAVAILABLE");
  const credential = await navigator.credentials.create({
    publicKey: {
      rp: options.rp,
      user: { ...options.user, id: fromBase64Url(options.user.id) },
      challenge: fromBase64Url(options.challenge),
      timeout: options.timeout,
      pubKeyCredParams: options.pubKeyCredParams,
      authenticatorSelection: options.authenticatorSelection,
      attestation: options.attestation,
      excludeCredentials: (options.excludeCredentials ?? []).map(descriptor)
    }
  });
  if (!credential) throw new Error("WEBAUTHN_REGISTRATION_CANCELLED");
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      attestationObject: toBase64Url(credential.response.attestationObject),
      authenticatorData: null,
      signature: null,
      userHandle: null,
      transports: typeof credential.response.getTransports === "function" ? credential.response.getTransports() : []
    }
  };
}

export async function getPasskeyAssertion(options) {
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("WEBAUTHN_UNAVAILABLE");
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: fromBase64Url(options.challenge),
      timeout: options.timeout ?? options.timeoutMs,
      rpId: options.rpId,
      allowCredentials: (options.allowCredentials ?? []).map(descriptor),
      userVerification: options.userVerification ?? "required"
    }
  });
  if (!credential) throw new Error("WEBAUTHN_ASSERTION_CANCELLED");
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      attestationObject: null,
      authenticatorData: toBase64Url(credential.response.authenticatorData),
      signature: toBase64Url(credential.response.signature),
      userHandle: toBase64Url(credential.response.userHandle),
      transports: []
    }
  };
}
