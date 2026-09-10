const FALLBACK_EXCERPT = "Artikel belum memiliki ringkasan.";
const BLOCK_PATTERN = /<!--\s+wp:([a-z0-9-\/]+)(?:\s+({[\s\S]*?}))?\s+-->([\s\S]*?)<!--\s+\/wp:\1\s+-->/gi;

const DEFAULT_ARTICLE_VALUE = [
  {
    type: "p",
    children: [{ text: "" }],
  },
];

export const ALLOWED_ARTICLE_BLOCKS = [
  "core/paragraph",
  "core/heading",
  "core/list",
  "core/quote",
  "core/separator",
];

export function getDefaultArticleValue() {
  return cloneJson(DEFAULT_ARTICLE_VALUE);
}

export function getDefaultArticleRaw() {
  return JSON.stringify(getDefaultArticleValue());
}

export function getArticleEditorValue(articleOrRaw) {
  const raw = typeof articleOrRaw === "string"
    ? articleOrRaw
    : getArticleContentRaw(articleOrRaw);
  const plateValue = parseArticleValue(raw);

  if (plateValue) {
    return plateValue;
  }

  return legacyBlocksToPlateValue(getParsedLegacyBlocks(raw));
}

export function parseArticleValue(value) {
  const candidate = typeof value === "string" ? safeJsonParse(value) : value;

  if (!Array.isArray(candidate) || !candidate.every(isDescendantNode)) {
    return null;
  }

  return candidate;
}

export function getArticleDocument(articleOrRaw) {
  const raw = typeof articleOrRaw === "string"
    ? articleOrRaw
    : getArticleContentRaw(articleOrRaw);
  const plateValue = parseArticleValue(raw);

  if (plateValue) {
    return { kind: "plate", value: plateValue };
  }

  return {
    kind: "legacy",
    value: getParsedLegacyBlocks(raw),
  };
}

export function getArticleContentRaw(article) {
  if (typeof article?.content_raw === "string" && article.content_raw.trim()) {
    return article.content_raw;
  }

  if (Array.isArray(article?.blocks) && article.blocks.length) {
    const plateValue = parseArticleValue(article.blocks);
    if (plateValue) {
      return JSON.stringify(plateValue);
    }

    return legacyBlocksToRaw(article.blocks);
  }

  return getDefaultArticleRaw();
}

export function rawToLegacyBlocks(raw) {
  const plateValue = parseArticleValue(raw);

  if (plateValue) {
    return plateValue;
  }

  return getParsedLegacyBlocks(raw)
    .map((block) => normalizeParsedLegacyBlock(block))
    .filter(Boolean);
}

export function getArticleContentText(articleOrRaw) {
  const document = getArticleDocument(articleOrRaw);

  if (document.kind === "plate") {
    return extractTextFromPlateNodes(document.value)
      .replace(/\s+/g, " ")
      .trim();
  }

  return document.value
    .map((block) => extractTextFromLegacyBlock(block))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getArticleExcerptText(article, fallback = FALLBACK_EXCERPT) {
  if (article?.excerpt) {
    return article.excerpt;
  }

  const derived = getArticleContentText(article);
  if (!derived) {
    return fallback;
  }

  return derived.length > 180 ? `${derived.slice(0, 177).trim()}...` : derived;
}

export function getParsedArticleBlocks(articleOrRaw) {
  return getArticleDocument(articleOrRaw).kind === "legacy"
    ? getArticleDocument(articleOrRaw).value
    : [];
}

function getParsedLegacyBlocks(rawValue) {
  const raw = typeof rawValue === "string" && rawValue.trim()
    ? rawValue
    : "";

  const blocks = [];
  let match;

  while ((match = BLOCK_PATTERN.exec(raw)) !== null) {
    const [, rawName, rawAttributes, innerHtml] = match;
    const name = rawName.includes("/") ? rawName : `core/${rawName}`;
    const attributes = parseAttributes(rawAttributes);

    if (ALLOWED_ARTICLE_BLOCKS.includes(name)) {
      blocks.push({
        name,
        attributes,
        innerHTML: innerHtml.trim(),
      });
    }
  }

  if (blocks.length === 0) {
    blocks.push({
      name: "core/paragraph",
      attributes: {
        content: stripWrappingParagraph(raw),
      },
      innerHTML: `<p>${raw}</p>`,
    });
  }

  return blocks;
}

function isDescendantNode(node) {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (typeof node.text === "string") {
    return true;
  }

  return typeof node.type === "string"
    && Array.isArray(node.children)
    && node.children.every(isDescendantNode);
}

function extractTextFromPlateNodes(nodes) {
  return (Array.isArray(nodes) ? nodes : [])
    .map((node) => extractTextFromPlateNode(node))
    .join(" ");
}

function extractTextFromPlateNode(node) {
  if (!node || typeof node !== "object") {
    return "";
  }

  if (typeof node.text === "string") {
    return node.text;
  }

  const childText = extractTextFromPlateNodes(node.children || []);

  if (node.type === "document") {
    return node.filename || childText;
  }

  return childText;
}

function legacyBlocksToPlateValue(blocks) {
  const elements = [];

  for (const block of blocks) {
    switch (block?.name) {
      case "core/heading": {
        const level = Number(block.attributes?.level || 2);
        elements.push({
          type: level <= 2 ? "h1" : level === 3 ? "h2" : "h3",
          children: [{ text: stripInlineHtml(block.attributes?.content || block.innerHTML || "") }],
        });
        break;
      }
      case "core/list": {
        const listType = block.attributes?.ordered ? "ol" : "ul";
        const items = extractListItems(block.innerHTML || "");
        elements.push({
          type: listType,
          listStyleType: block.attributes?.ordered ? "decimal" : "disc",
          children: items.map((item) => ({
            type: "li",
            children: [{ text: item }],
          })),
        });
        break;
      }
      case "core/quote":
        elements.push({
          type: "blockquote",
          children: [{ text: stripInlineHtml(block.innerHTML || "") }],
        });
        break;
      case "core/separator":
        elements.push({
          type: "p",
          children: [{ text: "---" }],
        });
        break;
      case "core/paragraph":
      default:
        elements.push({
          type: "p",
          children: [{ text: stripInlineHtml(block.attributes?.content || block.innerHTML || "") }],
        });
        break;
    }
  }

  return elements.length ? elements : getDefaultArticleValue();
}

function legacyBlocksToRaw(blocks) {
  const serializedBlocks = blocks
    .map((block) => serializeLegacyBlock(block))
    .filter(Boolean);

  return serializedBlocks.length ? serializedBlocks.join("\n\n") : getDefaultArticleRaw();
}

function serializeLegacyBlock(block) {
  const type = block?.type?.toString?.() || "text";

  switch (type) {
    case "heading_1":
      return serializeBlock("heading", { level: 2 }, `<h2>${escapeHtml(block?.text || "")}</h2>`);
    case "heading_2":
      return serializeBlock("heading", { level: 3 }, `<h3>${escapeHtml(block?.text || "")}</h3>`);
    case "heading_3":
      return serializeBlock("heading", { level: 4 }, `<h4>${escapeHtml(block?.text || "")}</h4>`);
    case "arabic_text":
    case "quran_verse":
      return serializeBlock("quote", {}, `<blockquote class="wp-block-quote"><p>${escapeHtml(block?.text || "")}</p></blockquote>`);
    case "bullet_list":
      return serializeBlock("list", {}, `<ul>${listItemsToHtml(block?.items || [])}</ul>`);
    case "number_list":
      return serializeBlock("list", { ordered: true }, `<ol>${listItemsToHtml(block?.items || [])}</ol>`);
    case "text":
    default:
      return serializeBlock("paragraph", {}, `<p>${preserveLineBreaks(block?.text || "")}</p>`);
  }
}

function serializeBlock(name, attributes, html) {
  const attributesString = Object.keys(attributes || {}).length ? ` ${JSON.stringify(attributes)}` : "";
  return `<!-- wp:${name}${attributesString} -->${html}<!-- /wp:${name} -->`;
}

function normalizeParsedLegacyBlock(block) {
  switch (block?.name) {
    case "core/heading": {
      const level = Number(block.attributes?.level || 2);
      return {
        type: level <= 2 ? "heading_1" : level === 3 ? "heading_2" : "heading_3",
        text: stripInlineHtml(block.attributes?.content || block.innerHTML || ""),
      };
    }
    case "core/list":
      return {
        type: block.attributes?.ordered ? "number_list" : "bullet_list",
        items: extractListItems(block.innerHTML || ""),
      };
    case "core/quote":
      return {
        type: "text",
        text: stripInlineHtml(block.innerHTML || ""),
      };
    case "core/separator":
      return {
        type: "text",
        text: "---",
      };
    case "core/paragraph":
    default:
      return {
        type: "text",
        text: stripInlineHtml(block.attributes?.content || block.innerHTML || ""),
      };
  }
}

function extractTextFromLegacyBlock(block) {
  switch (block?.name) {
    case "core/heading":
      return stripInlineHtml(block.attributes?.content || block.innerHTML || "");
    case "core/list":
      return extractListItems(block.innerHTML || "").join(" ");
    case "core/quote":
      return stripInlineHtml(block.innerHTML || "");
    case "core/separator":
      return "";
    case "core/paragraph":
    default:
      return stripInlineHtml(block.attributes?.content || block.innerHTML || "");
  }
}

function parseAttributes(rawAttributes) {
  if (!rawAttributes) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawAttributes);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    return {};
  }

  return {};
}

function extractListItems(html) {
  return Array.from((html || "").matchAll(/<li[^>]*>(.*?)<\/li>/gis))
    .map((match) => stripInlineHtml(match[1] || ""))
    .filter(Boolean);
}

function listItemsToHtml(items) {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function preserveLineBreaks(text) {
  return escapeHtml(text || "").replace(/\n/g, "<br>");
}

function stripWrappingParagraph(raw) {
  if (!raw) {
    return "";
  }

  const paragraphMatch = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return paragraphMatch ? stripInlineHtml(paragraphMatch[1]) : stripInlineHtml(raw);
}

function stripInlineHtml(value) {
  return (value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|blockquote|li|h1|h2|h3|h4|h5|h6|cite)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function escapeHtml(value) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
