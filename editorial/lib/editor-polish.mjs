import sanitizeHtml from "sanitize-html";
import { safeEditorLink } from "./editor-links.mjs";
import { safeMediaUrl } from "./media-validation.mjs";
import { youtubeEmbedUrl } from "../../packages/article-youtube/index.mjs";

export function cleanPastedHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: ["div", "p", "br", "h2", "h3", "h4", "span", "strong", "em", "u", "s", "code", "blockquote", "ul", "ol", "li", "a", "hr", "img", "sup", "iframe"],
    allowedAttributes: { iframe: ["src"], div: ["data-arabic-block", "data-quran-block", "dir", "lang"], blockquote: ["data-quran-block", "data-pull-quote", "dir", "lang"], aside: ["data-marginalia"], sup: ["data-footnote-id", "data-footnote-text"], a: ["href"], ol: ["start"], img: ["src", "alt"], p: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], span:["style"] },
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] }, span: { "font-weight":[/^(bold|[6-9]00)$/], "font-style":[/^italic$/], "text-decoration":[/^(underline|line-through)( underline| line-through)?$/], "text-decoration-line":[/^(underline|line-through)( underline| line-through)?$/] } },
    transformTags: {
      iframe: (tagName, attrs) => ({ tagName, attribs: { src: youtubeEmbedUrl(attrs.src) || "" } }),
      h1: "h2", h5: "h4", h6: "h4", div: (tag, attrs) => Object.hasOwn(attrs, "data-quran-block") ? { tagName: "div", attribs: { "data-quran-block": "", dir: "rtl", lang: "ar" } } : Object.hasOwn(attrs, "data-arabic-block") ? { tagName: "div", attribs: { "data-arabic-block": "", dir: "rtl", lang: "ar" } } : { tagName: "p", attribs: {} }, i: "em", strike: "s", del: "s",
      // Google Docs wraps a whole document in a normal-weight <b> element.
      b: (tag, attrs) => ({ tagName: /font-weight:\s*(normal|400)\b/i.test(attrs.style || "") ? "span" : "strong", attribs:{} }),
      a: (tag, attrs) => ({ tagName: tag, attribs: safeEditorLink(attrs.href) ? { href: attrs.href } : {} }),
      img: (tag, attrs) => ({ tagName: tag, attribs: safeMediaUrl(attrs.src) ? { src: attrs.src, alt: (attrs.alt || "").slice(0, 500) } : {} }),
    },
    exclusiveFilter: (frame) => ["img", "iframe"].includes(frame.tag) && !frame.attribs.src,
  });
}

export function slashQuery(state) {
  const { $from, empty } = state.selection;
  if (!empty || $from.parent.type.name !== "paragraph") return null;
  const text = $from.parent.textBetween(0, $from.parentOffset, "", "\ufffc");
  const match = /^\/([^\s/]{0,40})$/.exec(text);
  return match ? { query: match[1].toLocaleLowerCase("id-ID"), from: $from.start(), to: $from.pos } : null;
}

export const SLASH_COMMANDS = [
  { id: "paragraph", label: "Teks biasa", hint: "Paragraf", search: "paragraph teks paragraf", command: "setParagraph" },
  ...[2, 3, 4].map((level) => ({ id: `h${level}`, label: `Heading ${level - 1}`, hint: `Judul bagian ${level - 1}`, search: `heading judul h${level} ${level - 1}`, command: "setHeading", args: { level } })),
  { id: "pull-quote", label: "Pull quote", hint: "Kutipan menonjol keluar dari kolom teks", search: "pull quote kutipan sorotan outdent", command: "setPullQuote" },
  { id: "marginalia", label: "Marginalia", hint: "Catatan singkat di sisi teks", search: "marginalia catatan samping margin", command: "setMarginalia" },
  { id: "bullet", label: "Daftar bullet", hint: "Daftar tanpa nomor", search: "bullet list daftar", command: "toggleBulletList" },
  { id: "number", label: "Daftar bernomor", hint: "Daftar berurutan", search: "number ordered nomor daftar", command: "toggleOrderedList" },
  { id: "quran", label: "Ayat Al-Qur’an", hint: "Pilih surat, ayat, dan kata", search: "quran qur’an ayat surat surah" },
  { id: "arabic", label: "Teks Arab", hint: "RTL · rata kanan", search: "arab arabic rtl kanan", command: "toggleArabicBlock" },
  { id: "quote", label: "Kutipan", hint: "Blockquote", search: "quote kutipan", command: "toggleBlockquote" },
  { id: "divider", label: "Garis pemisah", hint: "Pisahkan bagian", search: "divider garis pemisah", command: "setHorizontalRule" },
  { id: "media", label: "Media", hint: "Gambar, video, audio, dokumen", search: "media gambar image video audio dokumen" },
];
export function matchingSlashCommands(query) { return SLASH_COMMANDS.filter((item) => `${item.label} ${item.search}`.toLocaleLowerCase("id-ID").includes(query)); }

export function documentOutline(doc) {
  const items = [];
  doc.descendants((node, position) => {
    if (node.type.name === "heading") items.push({ position, level: node.attrs.level, title: node.textContent.trim() || "Judul bagian tanpa teks" });
  });
  return items;
}
