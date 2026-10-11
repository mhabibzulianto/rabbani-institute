// Declarative schema also embedded in the SQL patch: identical validation rules
// apply to server actions and direct RPC calls.
const text = (max = 3000) => ({ type: "string", max });
const url = { type: "string", max: 2048, safeUrl: true };
const object = (properties, required = []) => ({ type: "object", properties, required });
const array = (items, max = 30, min = 0) => ({ type: "array", items, max, min });
const enumeration = (...values) => ({ type: "string", enum: values });
const integer = (min, max) => ({ type: "integer", min, max });
const ref = (name) => ({ ref: name });
const heading = { label: text(120), title: text(200), description: text() };
const buttons = array(ref("button"), 2);
const collection = {
  ...heading, source: enumeration("latest", "selected"), limit: integer(1, 12),
  selectedIds: array(integer(1, 2147483647), 12),
  catalogUrl: url, catalogLabel: text(100), emptyMessage: text(500),
};

export const landingSchema = {
  root: object({ schemaVersion: { type: "integer", enum: [1] }, seo: ref("seo"), blocks: array(ref("block"), 40, 1) }, ["schemaVersion", "seo", "blocks"]),
  definitions: {
    seo: object({ title: text(200), description: text(500), image: url }, ["title", "description"]),
    button: object({ label: text(100), href: url }, ["label", "href"]),
    media: object({ src: url, alt: text(500), caption: text(500) }, ["src"]),
    richDoc: object({ type: { type: "string", enum: ["doc"] }, content: array(ref("richNode"), 500) }, ["type", "content"]),
    richNode: object({
      type: enumeration("paragraph", "heading", "text", "bulletList", "orderedList", "listItem", "hardBreak"),
      text: text(10000), content: array(ref("richNode"), 500),
      attrs: object({ level: integer(2, 4), start: integer(1, 1000) }),
      marks: array(ref("mark"), 4),
    }, ["type"]),
    mark: object({ type: enumeration("bold", "italic", "strike", "link"), attrs: object({ href: url }) }, ["type"]),
    block: { type: "block" },
  },
  blocks: {
    hero: object({ ...heading, buttons, image: ref("media"), imagePosition: enumeration("left", "right"), variant: enumeration("default", "soft") }, ["title"]),
    text: object({ title: text(200), content: ref("richDoc") }, ["content"]),
    features: object({ ...heading, items: array(object({ icon: enumeration("book", "graduation", "shield", "sparkles", "check"), title: text(200), description: text(), systemValue: enumeration("payment-status") }, ["title", "description"]), 12, 1) }, ["title", "items"]),
    imageText: object({ ...heading, image: ref("media"), content: ref("richDoc"), buttons, imagePosition: enumeration("left", "right") }, ["title", "image", "content"]),
    courses: object(collection, ["title", "source", "limit", "selectedIds"]),
    exams: object(collection, ["title", "source", "limit", "selectedIds"]),
    articles: object(collection, ["title", "source", "limit", "selectedIds"]),
    cta: object({ ...heading, buttons, variant: enumeration("default", "soft", "dark") }, ["title", "buttons"]),
    faq: object({ ...heading, items: array(object({ question: text(300), answer: text(5000) }, ["question", "answer"]), 30, 1) }, ["title", "items"]),
  },
};

export const LANDING_LIMITS = { bytes: 262144, depth: 16, nodes: 5000 };

export function isSafeLandingUrl(value) {
  if (typeof value !== "string" || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return false;
  if (!value) return true; // Optional media/SEO fields may be blank in draft.
  return /^\/(?!\/)/u.test(value) || /^#[a-zA-Z][\w-]*$/u.test(value)
    || /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*(?::[0-9]{1,5})?(?:[/?#][^\s\\]*)?$/u.test(value);
}

export function validateLandingDocument(value) {
  const seen = new Set();
  let nodes = 0;
  const fail = (path) => { throw new Error(`Dokumen landing tidak valid: ${path}`); };
  // Bound untrusted trees before serialization (also rejects cycles).
  function bound(node, depth = 0) {
    if (++nodes > LANDING_LIMITS.nodes || depth > LANDING_LIMITS.depth) fail("batas struktur");
    if (node && typeof node === "object") {
      if (seen.has(node)) fail("referensi berulang");
      seen.add(node);
      for (const child of Object.values(node)) bound(child, depth + 1);
    }
  }
  bound(value);
  if (new TextEncoder().encode(JSON.stringify(value)).length > LANDING_LIMITS.bytes) fail("batas ukuran");
  function visit(node, spec, path) {
    if (spec.ref) return visit(node, landingSchema.definitions[spec.ref], path);
    if (spec.type === "block") {
      if (!node || !landingSchema.blocks[node.type]) fail(path);
      return visit(node, object({ id: { type: "string", max: 80, pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*$" }, type: enumeration(...Object.keys(landingSchema.blocks)), enabled: { type: "boolean" }, props: landingSchema.blocks[node.type] }, ["id", "type", "enabled", "props"]), path);
    }
    if (spec.type === "object") {
      if (!node || Array.isArray(node) || typeof node !== "object") fail(path);
      for (const key of spec.required || []) if (!(Object.hasOwn(node, key))) fail(`${path}.${key}`);
      for (const [key, child] of Object.entries(node)) {
        if (!Object.hasOwn(spec.properties, key)) fail(`${path}.${key}`);
        visit(child, spec.properties[key], `${path}.${key}`);
      }
    } else if (spec.type === "array") {
      if (!Array.isArray(node) || node.length < spec.min || node.length > spec.max) fail(path);
      node.forEach((child, i) => visit(child, spec.items, `${path}[${i}]`));
    } else if (spec.type === "integer") {
      if (!Number.isSafeInteger(node) || (spec.min != null && node < spec.min) || (spec.max != null && node > spec.max)) fail(path);
    } else if (typeof node !== spec.type) fail(path);
    if (spec.type === "string" && (Array.from(node).length > (spec.max ?? Infinity) || (spec.pattern && !new RegExp(spec.pattern).test(node)) || (spec.safeUrl && !isSafeLandingUrl(node)))) fail(path);
    if (spec.enum && !spec.enum.includes(node)) fail(path);
  }
  visit(value, landingSchema.root, "document");
  const ids = value.blocks.map((block) => block.id);
  if (new Set(ids).size !== ids.length) fail("ID blok duplikat");
  return JSON.parse(JSON.stringify(value));
}
