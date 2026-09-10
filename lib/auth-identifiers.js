import { normalizeWhatsappNumber } from "@/lib/exam-utils";

const WHATSAPP_AUTH_DOMAIN = "auth.rabbani.internal";

export function normalizeEmailIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

export function looksLikeEmail(value) {
  const candidate = normalizeEmailIdentifier(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate);
}

export function normalizeWhatsappIdentifier(value) {
  return normalizeWhatsappNumber(value);
}

export function looksLikeWhatsapp(value) {
  const normalized = normalizeWhatsappIdentifier(value);
  return normalized.length >= 10;
}

export function buildWhatsappAuthEmail(phoneNumber) {
  const normalized = normalizeWhatsappIdentifier(phoneNumber);

  if (!normalized) {
    return "";
  }

  return `wa-${normalized}@${WHATSAPP_AUTH_DOMAIN}`;
}
