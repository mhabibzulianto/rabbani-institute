export const WIB_TIME_ZONE = "Asia/Jakarta";

export function formatWibDate(value, locale = "id-ID") {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: WIB_TIME_ZONE,
  }).format(new Date(value));
}

export function formatWibDateTime(value, locale = "id-ID") {
  if (!value) {
    return "-";
  }

  return `${new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: WIB_TIME_ZONE,
  }).format(new Date(value))} WIB`;
}

export function toWibDateInputValue(value) {
  if (!value) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function wibDateToIso(value, boundary = "start") {
  const text = value?.toString().trim();

  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  if (boundary === "end") {
    return new Date(Date.UTC(year, monthIndex, day, 16, 59, 59, 999)).toISOString();
  }

  return new Date(Date.UTC(year, monthIndex, day, 17, 0, 0, 0) - 24 * 60 * 60 * 1000).toISOString();
}

export function toWibDateTimeInputValue(value) {
  if (!value) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  return year && month && day && hour && minute ? `${year}-${month}-${day}T${hour}:${minute}` : "";
}

export function wibDateTimeToIso(value) {
  const text = value?.toString().trim();

  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  return new Date(Date.UTC(year, monthIndex, day, hour - 7, minute, 0, 0)).toISOString();
}
