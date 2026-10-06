import sanitizeHtml from "sanitize-html";
import { articleListHref, normalizeArticleFilters } from "./article-list.mjs";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const paragraph = (text) => `<p>${escape(text).replace(/\n/g, "<br />")}</p>`;
const parse = (value) => { try { return JSON.parse(value); } catch { return null; } };

export function previewReturnHref(value) {
  if (typeof value !== "string") return "/artikel";
  try {
    const url = new URL(value, "http://editorial.local");
    if (url.origin !== "http://editorial.local" || url.pathname !== "/artikel") return "/artikel";
    return articleListHref(normalizeArticleFilters(Object.fromEntries(url.searchParams)));
  } catch { return "/artikel"; }
}

const sanitizerOptions = {
  allowedTags: ["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "del", "sub", "sup", "mark", "kbd", "a", "ul", "ol", "li", "blockquote", "cite", "hr", "pre", "code", "figure", "figcaption", "img", "video", "audio", "source", "div", "span", "table", "thead", "tbody", "tr", "th", "td", "section"],
  allowedAttributes: {
    "*": ["dir", "lang", "class", "id", "style"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    video: ["src", "controls", "preload"], audio: ["src", "controls", "preload"],
    source: ["src", "type"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan", "scope"],
    ol: ["start"],
    figure: ["data-media", "data-filename"],
  },
  allowedClasses: { "*": ["preview-columns", "preview-columns-three", "preview-column", "preview-arabic", "preview-quran", "preview-footnotes"] },
  allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"], video: ["http", "https"], audio: ["http", "https"], source: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attrs) => ({ tagName, attribs: { ...attrs, target: attrs.href?.startsWith("#") ? "_self" : "_blank", rel: "noopener noreferrer" } }),
    img: (tagName, attrs) => ({ tagName, attribs: { ...attrs, loading: "lazy", alt: attrs.alt || "" } }),
  },
};

export function sanitizeArticleHtml(html) {
  return sanitizeHtml(html, sanitizerOptions);
}

export function getArticlePreview(article) {
  const citations = new Map();
  let processed = 0;
  function renderNode(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 40 || ++processed > 20000) return "";
    if (node.type === "text" || typeof node.text === "string") {
      let html = escape(node.text);
      const marks = Array.isArray(node.marks) ? node.marks : [];
      for (const [mark, tag] of [["bold", "strong"], ["italic", "em"], ["underline", "u"], ["strike", "s"], ["code", "code"], ["subscript", "sub"], ["superscript", "sup"], ["highlight", "mark"]]) {
        if (node[mark] || (mark === "strike" && node.strikethrough) || marks.some((item) => item?.type === mark)) html = `<${tag}>${html}</${tag}>`;
      }
      const link = marks.find((mark) => mark?.type === "link");
      if (node.linkUrl || link) html = `<a href="${escape(node.linkUrl || link.attrs?.href)}">${html}</a>`;
      if (node.footnoteCitation?.id) {
        const citation = node.footnoteCitation;
        if (!citations.has(citation.id)) citations.set(citation.id, { ...citation, index: citations.size + 1 });
        const number = citations.get(citation.id).index;
        html = `<sup><a href="#preview-footnote-${number}">${number}</a></sup>`;
      }
      return html;
    }
    const attrs = node.attrs || node;
    const childNodes = Array.isArray(node.content) ? node.content : Array.isArray(node.children) ? node.children : [];
    const children = childNodes.map((child) => renderNode(child, depth + 1)).join("");
    const align = ["left", "right", "center", "justify"].includes(attrs.textAlign || node.align) ? ` style="text-align:${attrs.textAlign || node.align}"` : "";
    if (node.type === "heading" || /^h[1-6]$/.test(node.type)) {
      const level = node.type === "heading" ? Math.max(2, Math.min(6, Number(attrs.level) || 2)) : Math.min(6, Number(node.type.slice(1)) + 1);
      return `<h${level}${align}>${children}</h${level}>`;
    }
    switch (node.type) {
      case "doc": return children;
      case "hardBreak": return "<br />";
      case "horizontalRule": case "hr": return "<hr />";
      case "blockquote": return `<blockquote>${children}</blockquote>`;
      case "ayah-quote": case "arabic-quote": return `<blockquote class="${node.type === "ayah-quote" ? "preview-quran" : "preview-arabic"}" dir="rtl" lang="ar">${children}</blockquote>`;
      case "bulletList": case "ul": return `<ul>${children}</ul>`;
      case "orderedList": case "ol": return `<ol start="${Math.max(1, Number(attrs.start) || 1)}">${children}</ol>`;
      case "listItem": case "li": return `<li>${children}</li>`;
      case "codeBlock": return `<pre><code>${children}</code></pre>`;
      case "columns-2": case "columns-3": return `<div class="preview-columns${node.type === "columns-3" ? " preview-columns-three" : ""}">${children}</div>`;
      case "column-item": return `<div class="preview-column">${children}</div>`;
      case "table": return `<table><tbody>${children}</tbody></table>`;
      case "tableRow": case "table-row": return `<tr>${children}</tr>`;
      case "tableCell": case "table-cell": return `<td>${children}</td>`;
      case "tableHeader": return `<th scope="col">${children}</th>`;
      case "image": return `<figure><img src="${escape(attrs.src)}" alt="${escape(attrs.alt || "")}" />${attrs.caption || attrs.filename ? `<figcaption>${escape(attrs.caption || attrs.filename)}</figcaption>` : ""}</figure>`;
      case "video": case "audio": return `<figure><${node.type} controls preload="metadata" src="${escape(attrs.src)}"></${node.type}>${attrs.caption || attrs.filename ? `<figcaption>${escape(attrs.caption || attrs.filename)}</figcaption>` : ""}</figure>`;
      case "document": return `<figure><a href="${escape(attrs.src)}">${escape(attrs.filename || "Buka dokumen")}</a>${attrs.caption ? `<figcaption>${escape(attrs.caption)}</figcaption>` : ""}</figure>`;
      case "paragraph": case "p": return `<p${align}>${children}</p>`;
      default: return children ? `<div>${children}</div>` : paragraph(node.text || "");
    }
  }

  function renderLegacy(block) {
    if (!block || typeof block !== "object") return "";
    const attrs = block.attributes || {};
    const inner = block.innerHTML || "";
    if (block.name) {
      switch (block.name) {
        case "core/heading": return attrs.content ? `<h${Math.max(2, Math.min(6, Number(attrs.level) || 2))}>${attrs.content}</h${Math.max(2, Math.min(6, Number(attrs.level) || 2))}>` : inner;
        case "core/list": return attrs.values ? `<${attrs.ordered ? "ol" : "ul"}${attrs.ordered ? ` start="${Math.max(1, Number(attrs.start) || 1)}"` : ""}>${attrs.values}</${attrs.ordered ? "ol" : "ul"}>` : inner;
        case "core/quote": return attrs.value ? `<blockquote>${attrs.value}${attrs.citation ? `<cite>${attrs.citation}</cite>` : ""}</blockquote>` : inner;
        case "core/separator": return "<hr />";
        case "core/image": return `<figure>${inner || `<img src="${escape(attrs.url)}" alt="${escape(attrs.alt)}" />`}</figure>`;
        default: return attrs.content ? `<p>${attrs.content}</p>` : inner;
      }
    }
    if (Array.isArray(block.children) || Array.isArray(block.content)) return renderNode(block);
    if (/^heading_[1-3]$/.test(block.type)) return `<h${Number(block.type.slice(-1)) + 1}>${escape(block.text)}</h${Number(block.type.slice(-1)) + 1}>`;
    if (["bullet_list", "number_list"].includes(block.type)) {
      const tag = block.type === "bullet_list" ? "ul" : "ol";
      return `<${tag}>${(Array.isArray(block.items) ? block.items : []).map((item) => `<li>${escape(item)}</li>`).join("")}</${tag}>`;
    }
    if (["arabic_text", "quran_verse"].includes(block.type)) return `<blockquote class="preview-arabic" dir="rtl" lang="ar">${escape(block.text)}</blockquote>`;
    return paragraph(block.text || "");
  }

  let raw = "";
  if (article.content_json?.type === "doc") raw = renderNode(article.content_json);
  else if (article.content_raw?.trim()) {
    const parsed = parse(article.content_raw);
    raw = Array.isArray(parsed) ? parsed.map(renderLegacy).join("") : parsed?.type === "doc" ? renderNode(parsed) : article.content_raw;
  } else if (Array.isArray(article.blocks)) raw = article.blocks.map(renderLegacy).join("");

  if (citations.size) {
    raw += `<section class="preview-footnotes"><h2>Catatan kaki</h2><ol>${Array.from(citations.values()).map((citation) => {
      const text = [citation.author || "Anon.", citation.year || "n.d.", citation.title, citation.publisher || citation.publication || citation.journal, citation.page ? `hlm. ${citation.page}` : "", citation.note].filter(Boolean).join(". ");
      return `<li id="preview-footnote-${citation.index}">${escape(text)}${citation.url ? ` <a href="${escape(citation.url)}">Sumber</a>` : ""}</li>`;
    }).join("")}</ol></section>`;
  }
  const html = sanitizeArticleHtml(raw);
  const plain = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
  return {
    html, hasContent: Boolean(plain || /<(img|video|audio|hr)\b/.test(html)),
    coverHtml: article.cover_image_url ? sanitizeArticleHtml(`<img src="${escape(article.cover_image_url)}" alt="${escape(article.title)}" />`) : "",
  };
}
