import { formatWibDate, formatWibDateTime } from "@/lib/wib";

export function normalizeWhatsappNumber(value) {
  const digits = (value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith("8")) {
    return `62${digits}`;
  }

  return digits;
}

export function formatWhatsappNumber(value) {
  const normalized = normalizeWhatsappNumber(value);

  if (!normalized) {
    return "-";
  }

  return `+${normalized}`;
}

export function parseAllowedPhones(rawText) {
  return Array.from(
    new Set(
      (rawText || "")
        .split(/[\n,;]+/g)
        .map((item) => normalizeWhatsappNumber(item))
        .filter(Boolean),
    ),
  );
}

export function formatExamWindow(exam, locale = "id-ID") {
  if (!exam?.opens_at || !exam?.closes_at) {
    return "-";
  }

  return `${formatWibDate(exam.opens_at, locale)} - ${formatWibDate(exam.closes_at, locale)} (WIB)`;
}

export function formatExamDateTime(value, locale = "id-ID") {
  return formatWibDateTime(value, locale);
}

export function minutesToExamDurationLabel(minutes) {
  const safeMinutes = Number(minutes) || 0;

  if (safeMinutes >= 60) {
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;
    return remainingMinutes ? `${hours} jam ${remainingMinutes} menit` : `${hours} jam`;
  }

  return `${safeMinutes} menit`;
}

export function formatRemainingSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
