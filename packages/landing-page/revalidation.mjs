import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export function signLandingRequest(body, secret) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("Revalidation secret unavailable");
  return createHmac("sha256", secret).update(body).digest("hex");
}
export function landingRequestProof(signature) { return createHash("sha256").update(signature).digest("hex"); }
export function verifyLandingRequest(body, signature, secret, now = Math.floor(Date.now() / 1000)) {
  if (typeof body !== "string" || Buffer.byteLength(body) > 1024 || !/^[a-f0-9]{64}$/.test(signature || "")) throw new Error("Invalid request");
  const expected = signLandingRequest(body, secret);
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) throw new Error("Invalid signature");
  const value = JSON.parse(body);
  if (!value || Object.keys(value).sort().join(",") !== "nonce,page,revision,timestamp" || value.page !== "home" || !/^[1-9]\d{0,18}$/.test(value.revision) || typeof value.revision !== "string" || !/^[a-f0-9]{64}$/.test(value.nonce) || !Number.isSafeInteger(value.timestamp) || Math.abs(value.timestamp - now) > 300) throw new Error("Invalid target or expired request");
  return value;
}
