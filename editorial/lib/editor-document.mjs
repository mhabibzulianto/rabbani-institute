import { getSchema } from "@tiptap/core";
import { articleEditorExtensions } from "./tiptap-extensions.mjs";
import { getArticlePreview } from "./article-preview.mjs";
import { safeEditorLink } from "./editor-links.mjs";
import { safeMediaUrl } from "./media-validation.mjs";
export { safeEditorLink } from "./editor-links.mjs";

const schema = getSchema(articleEditorExtensions());
const allowedNodes = new Set(["doc", "paragraph", "heading", "text", "hardBreak", "horizontalRule", "blockquote", "bulletList", "orderedList", "listItem", "image", "video", "audio", "document"]);
const allowedMarks = new Set(["bold", "italic", "underline", "strike", "code", "link"]);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
export const emptyEditorDocument = () => ({ type: "doc", content: [{ type: "paragraph" }] });
export const validArticleId = (value) => typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;

export function validateEditorDocument(doc) {
  if (!doc || doc.type !== "doc" || !Array.isArray(doc.content) || JSON.stringify(doc).length > 500000) throw new Error("Dokumen tidak valid atau terlalu besar (maksimal 500 KB).");
  let count = 0;
  function check(node, depth) {
    if (!node || !allowedNodes.has(node.type) || ++count > 20000 || depth > 40) throw new Error("Dokumen memuat blok yang belum didukung editor MVP.");
    const media = ["image", "video", "audio", "document"].includes(node.type);
    const attrs = media ? ["src", "alt", "caption", "filename"] : { paragraph: ["textAlign"], heading: ["level", "textAlign"], orderedList: ["start", "type"] }[node.type] || [];
    if (media && (!safeMediaUrl(node.attrs?.src) || ["alt", "caption", "filename"].some((key) => node.attrs?.[key] != null && (typeof node.attrs[key] !== "string" || node.attrs[key].length > (key === "filename" ? 255 : 500))))) throw new Error("URL atau informasi media tidak valid.");
    if (node.attrs && Object.keys(node.attrs).some((key) => !attrs.includes(key))) throw new Error("Atribut blok belum didukung editor MVP.");
    if (node.attrs?.textAlign && !["left", "center", "right", "justify"].includes(node.attrs.textAlign)) throw new Error("Perataan teks tidak valid.");
    if (node.type === "heading" && ![2, 3, 4].includes(node.attrs?.level)) throw new Error("Heading tidak valid.");
    if (node.type === "orderedList" && node.attrs?.start != null && (!Number.isSafeInteger(node.attrs.start) || node.attrs.start < 1)) throw new Error("Nomor daftar tidak valid.");
    if (node.marks != null && !Array.isArray(node.marks)) throw new Error("Format teks tidak valid.");
    for (const mark of node.marks || []) {
      if (!allowedMarks.has(mark.type) || (mark.type === "link" && !safeEditorLink(mark.attrs?.href))) throw new Error("Format atau tautan tidak didukung.");
    }
    if (node.content != null && !Array.isArray(node.content)) throw new Error("Isi dokumen tidak valid.");
    for (const child of node.content || []) check(child, depth + 1);
  }
  check(doc, 0);
  const parsed = schema.nodeFromJSON(doc);
  parsed.check();
  // ProseMirror attribute maps use null prototypes; RSC requires plain objects.
  return JSON.parse(JSON.stringify(parsed.toJSON()));
}

export function normalizeEditorPayload(input) {
  if (!input || !validArticleId(input.id) || !Number.isSafeInteger(input.version) || input.version < 1) throw new Error("Versi artikel tidak valid. Muat ulang editor.");
  const text = (key, limit) => {
    if (typeof input[key] !== "string" || input[key].length > limit) throw new Error(`${key} melebihi batas yang diizinkan.`);
    return input[key].trim();
  };
  const title = text("title", 200);
  if (!title) throw new Error("Judul artikel wajib diisi.");
  const tags = text("tags", 1000).split(",").map((tag) => tag.trim()).filter(Boolean);
  if (tags.length > 20 || tags.some((tag) => tag.length > 40)) throw new Error("Maksimal 20 tag, masing-masing 40 karakter.");
  const category = input.category || "";
  if (category && !validArticleId(category)) throw new Error("Kategori tidak valid.");
  if (input.cover && !safeMediaUrl(input.cover)) throw new Error("URL cover tidak valid.");
  return { title, excerpt: text("excerpt", 500) || null, topic: text("topic", 200) || null, tags: [...new Set(tags)], category_id: category || null, ...(Object.hasOwn(input, "cover") ? { cover_image_url: input.cover || null } : {}), content_json: validateEditorDocument(input.doc), content_schema_version: 1 };
}

export function canEditArticle(profile, article, userId) {
  return Boolean(article && (profile?.role === "admin" ? article.status !== "archived" : article.author_id === userId && ["draft", "rejected"].includes(article.status)));
}

function fromPlate(node) {
  if (["image", "video", "audio", "document"].includes(node.type)) return { type: node.type, attrs: { src: node.src, alt: node.alt || "", caption: node.caption || "", filename: node.filename || "" } };
  if (node.type === "hr") return { type: "horizontalRule" };
  if (typeof node.text === "string") {
    if (node.footnoteCitation || node.subscript || node.superscript || node.kbd || node.highlight) throw new Error("Format khusus belum didukung.");
    if (!node.text) return null;
    const marks = ["bold", "italic", "underline", "code"].filter((mark) => node[mark]).map((type) => ({ type }));
    if (node.strikethrough) marks.push({ type: "strike" });
    if (node.linkUrl) marks.push({ type: "link", attrs: { href: node.linkUrl } });
    // Preserve line breaks as explicit nodes instead of relying on whitespace.
    return node.text.split("\n").flatMap((text, index) => [...(index ? [{ type: "hardBreak" }] : []), ...(text ? [{ type: "text", text, ...(marks.length ? { marks } : {}) }] : [])]);
  }
  const types = { p: "paragraph", paragraph: "paragraph", h1: "heading", h2: "heading", h3: "heading", blockquote: "blockquote", ul: "bulletList", ol: "orderedList", li: "listItem" };
  const type = types[node.type];
  if (!type || !Array.isArray(node.children) || node.indent || node.dir || (node.listStyleType && !["disc", "decimal"].includes(node.listStyleType))) throw new Error("Blok khusus belum didukung.");
  let content = node.children.flatMap((child) => fromPlate(child) || []);
  if (type === "listItem" && content.some((child) => ["text", "hardBreak"].includes(child.type))) content = [{ type: "paragraph", content }];
  if (type === "blockquote" && content.some((child) => ["text", "hardBreak"].includes(child.type))) content = [{ type: "paragraph", content }];
  const attrs = { ...(type === "heading" ? { level: Number(node.type.slice(1)) + 1 } : {}), ...(type === "orderedList" && node.start ? { start: node.start } : {}), ...(node.align ? { textAlign: node.align } : {}) };
  return { type, ...(Object.keys(attrs).length ? { attrs } : {}), ...(content.length ? { content } : {}) };
}

export function prepareEditorDocument(article) {
  try {
    if (article.content_json) return { content: validateEditorDocument(article.content_json), unsupported: false };
    let source = article.blocks || [];
    if (article.content_raw?.trim()) {
      try { source = JSON.parse(article.content_raw); } catch { source = article.content_raw; }
    }
    if (source?.type === "doc") return { content: validateEditorDocument(source), unsupported: false };
    if (Array.isArray(source) && source.length === 0) return { content: emptyEditorDocument(), unsupported: false };
    if (Array.isArray(source) && source.every((node) => Array.isArray(node.children))) {
      return { content: validateEditorDocument({ type: "doc", content: source.flatMap((node) => fromPlate(node) || []) }), unsupported: false };
    }
    // Gutenberg/basic legacy HTML can be imported by Tiptap. Special blocks stay read-only.
    const supported = ["core/paragraph", "core/heading", "core/list", "core/quote", "core/separator", "core/image", "core/video", "core/audio"];
    const legacyTypes = ["paragraph", "heading_1", "heading_2", "heading_3", "bullet_list", "number_list"];
    if (typeof source === "string") {
      const names = [...source.matchAll(/<!--\s+wp:([a-z0-9-/]+)/gi)].map((match) => match[1].includes("/") ? match[1] : `core/${match[1]}`);
      if (names.some((name) => !supported.includes(name)) || /<(?:table|sup|sub|section|iframe|div|pre|h5|h6)\b|\b(?:dir|lang)\s*=/i.test(source)) throw new Error("Format khusus");
      const html = getArticlePreview(article).html.replace(/<(\/?)h1\b/g, "<$1h2");
      return { content: html || emptyEditorDocument(), unsupported: false };
    }
    if (Array.isArray(source) && source.every((block) => supported.includes(block.name) || legacyTypes.includes(block.type))) {
      const html = getArticlePreview(article).html;
      if (!/<(?:table|sup|sub|section)\b/i.test(html)) return { content: html || emptyEditorDocument(), unsupported: false };
    }
    throw new Error("Format khusus");
  } catch {
    return { content: emptyEditorDocument(), unsupported: true };
  }
}

export function serializeLegacyDocument(document) {
  const doc = validateEditorDocument(document);
  const containsMedia = (node) => ["image", "video", "audio", "document"].includes(node.type) || node.content?.some(containsMedia);
  // The public website's legacy reader understands Plate media blocks.
  if (containsMedia(doc)) {
    function plate(node) {
      if (node.type === "text") {
        const leaf = { text: node.text };
        for (const mark of node.marks || []) {
          if (mark.type === "link") leaf.linkUrl = mark.attrs.href;
          else leaf[mark.type === "strike" ? "strikethrough" : mark.type] = true;
        }
        return leaf;
      }
      if (node.type === "hardBreak") return { text: "\n" };
      if (["image", "video", "audio", "document"].includes(node.type)) return { type: node.type, ...node.attrs, children: [{ text: "" }] };
      const type = { paragraph: "p", heading: `h${node.attrs?.level - 1}`, horizontalRule: "hr", blockquote: "blockquote", bulletList: "ul", orderedList: "ol", listItem: "li" }[node.type];
      return { type, ...(node.attrs?.textAlign ? { align: node.attrs.textAlign } : {}), ...(node.type === "orderedList" ? { start: node.attrs?.start || 1 } : {}), children: node.content?.map(plate) || [{ text: "" }] };
    }
    const blocks = doc.content.map(plate);
    return { blocks, content_raw: JSON.stringify(blocks) };
  }
  function html(node) {
    if (node.type === "text") {
      let result = esc(node.text);
      for (const mark of node.marks || []) {
        const tag = { bold: "strong", italic: "em", underline: "u", strike: "s", code: "code" }[mark.type];
        result = tag ? `<${tag}>${result}</${tag}>` : `<a href="${esc(mark.attrs.href)}" rel="noopener noreferrer">${result}</a>`;
      }
      return result;
    }
    if (node.type === "hardBreak") return "<br />";
    if (node.type === "horizontalRule") return "<hr />";
    const tag = { paragraph: "p", heading: `h${node.attrs?.level}`, blockquote: "blockquote", bulletList: "ul", orderedList: "ol", listItem: "li" }[node.type];
    const style = node.attrs?.textAlign ? ` style="text-align:${node.attrs.textAlign}"` : "";
    const start = node.type === "orderedList" && node.attrs?.start ? ` start="${node.attrs.start}"` : "";
    return `<${tag}${style}${start}>${(node.content || []).map(html).join("")}</${tag}>`;
  }
  const blocks = doc.content.map((node) => {
    const rendered = html(node);
    const inner = (node.content || []).map(html).join("");
    const name = { paragraph: "core/paragraph", heading: "core/heading", blockquote: "core/quote", bulletList: "core/list", orderedList: "core/list", horizontalRule: "core/separator" }[node.type];
    const attributes = node.type === "heading" ? { level: node.attrs.level, content: inner }
      : node.type === "paragraph" ? { content: inner }
      : node.type === "blockquote" ? { value: inner }
      : ["bulletList", "orderedList"].includes(node.type) ? { ordered: node.type === "orderedList", values: inner, ...(node.type === "orderedList" ? { start: node.attrs?.start || 1 } : {}) } : {};
    return { name, attributes, innerHTML: rendered };
  });
  return { blocks, content_raw: blocks.map((block) => `<!-- wp:${block.name.replace("core/", "")}${Object.keys(block.attributes).length ? ` ${JSON.stringify(block.attributes)}` : ""} -->${block.innerHTML}<!-- /wp:${block.name.replace("core/", "")} -->`).join("\n") };
}
