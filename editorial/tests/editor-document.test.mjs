import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEditorPayload, validateEditorDocument, prepareEditorDocument, serializeLegacyDocument, canEditArticle, safeEditorLink } from "../lib/editor-document.mjs";
import { getArticlePreview } from "../lib/article-preview.mjs";

const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Tulisan tentang ilmu", marks: [{ type: "bold" }] }] }] };

test("Editor rejects unsafe links, invalid schemas and documents beyond limits", () => {
  for (const href of ["javascript:alert(1)", "data:text/html,x", "//unsafe.example"]) assert.equal(safeEditorLink(href), false);
  assert.equal(safeEditorLink("https://rabbaniinstitute.id"), true);
  assert.throws(() => validateEditorDocument({ type: "doc", content: [{ type: "text", text: "Not a block" }] }));
  assert.throws(() => validateEditorDocument({ type: "doc", content: [{ type: "image", attrs: { src: "x" } }] }));
  assert.throws(() => validateEditorDocument({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "link", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] }));
  assert.throws(() => validateEditorDocument({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a".repeat(500001) }] }] }));
});

test("Save payload normalizes metadata and cannot smuggle status or ownership", () => {
  const result = normalizeEditorPayload({ id: "1", version: 2, title: " Judul ", excerpt: "", topic: " Aqidah ", tags: "ilmu, ilmu, belajar", category: "3", doc, status: "published", author_id: "other" });
  assert.equal(result.title, "Judul");
  assert.deepEqual(result.tags, ["ilmu", "belajar"]);
  assert.equal(result.category_id, "3");
  assert.equal(Object.hasOwn(result, "status"), false);
  assert.equal(Object.hasOwn(result, "author_id"), false);
  assert.throws(() => normalizeEditorPayload({ id: "1", version: 0, title: "x", doc }));
});

test("Legacy rich text imports without deleting source; unsupported blocks stay read-only", () => {
  const article = { blocks: [{ type: "h1", children: [{ text: "Ilmu", bold: true }] }, { type: "ol", children: [{ type: "li", children: [{ text: "Belajar\nsetiap hari" }] }] }] };
  const original = JSON.stringify(article);
  const imported = prepareEditorDocument(article);
  assert.equal(imported.unsupported, false);
  assert.equal(imported.content.content[0].attrs.level, 2);
  assert.equal(imported.content.content[1].content[0].content[0].content[1].type, "hardBreak");
  assert.equal(JSON.stringify(article), original);
  assert.equal(prepareEditorDocument({ blocks: [{ type: "image", src: "x", children: [{ text: "" }] }] }).unsupported, true);
  assert.equal(prepareEditorDocument({ blocks: [{ type: "p", children: [{ text: "1", footnoteCitation: { id: "n" } }] }] }).unsupported, true);
});

test("Tiptap export keeps text formatting, links and nested lists readable to legacy readers", () => {
  const document = { type: "doc", content: [doc.content[0], { type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Sumber", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] }] }] }, { type: "horizontalRule" }] };
  const legacy = serializeLegacyDocument(document);
  assert.match(legacy.content_raw, /wp:list/);
  assert.match(legacy.content_raw, /<strong>Tulisan tentang ilmu<\/strong>/);
  assert.match(legacy.blocks[0].attributes.content, /<strong>/);
  assert.equal(legacy.blocks[1].attributes.ordered, true);
  const preview = getArticlePreview({ blocks: legacy.blocks });
  assert.match(preview.html, /Sumber/);
  assert.match(preview.html, /href="https:\/\/example.com"/);
  assert.match(preview.html, /<ol/);
  assert.equal(prepareEditorDocument({ content_raw: legacy.content_raw, blocks: legacy.blocks }).unsupported, false);
  assert.equal(prepareEditorDocument({ content_raw: '<!-- wp:table --><table><tr><td>Data</td></tr></table><!-- /wp:table -->' }).unsupported, true);
});

test("Writing permissions lock non-owners and articles under review", () => {
  const writer = { role: "instructor" };
  assert.equal(canEditArticle(writer, { author_id: "owner", status: "draft" }, "owner"), true);
  assert.equal(canEditArticle(writer, { author_id: "other", status: "draft" }, "owner"), false);
  for (const status of ["submitted", "published", "archived"]) assert.equal(canEditArticle(writer, { author_id: "owner", status }, "owner"), false);
  assert.equal(canEditArticle({ role: "admin" }, { status: "submitted" }, "admin"), true);
});
