export const FOOTNOTE_TEXT_LIMIT = 4000;
export const FOOTNOTE_LIMIT = 200;
export const validFootnoteId = (id) => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id);
export const validFootnoteText = (text) => typeof text === "string" && Boolean(text.trim()) && text.length <= FOOTNOTE_TEXT_LIMIT;
export function footnoteLinks(text) {
  const parts = [];
  let offset = 0;
  for (const match of String(text).matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const href = match[0].replace(/[.,;!?)}\]]+$/, "");
    try { if (!["http:", "https:"].includes(new URL(href).protocol)) continue; } catch { continue; }
    parts.push({ text: text.slice(offset, match.index) }, { text: href, href });
    offset = match.index + href.length;
  }
  parts.push({ text: text.slice(offset) });
  return parts;
}
const escape = (text) => String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
export const footnoteHtml = (text) => footnoteLinks(text).map(part => part.href ? `<a href="${escape(part.href)}" rel="noopener noreferrer">${escape(part.text)}</a>` : escape(part.text).replace(/\n/g, "<br />")).join("");
