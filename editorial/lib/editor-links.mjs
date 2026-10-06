export function safeEditorLink(value) {
  try { return typeof value === "string" && value.length <= 2000 && ["http:", "https:", "mailto:"].includes(new URL(value).protocol); } catch { return false; }
}
