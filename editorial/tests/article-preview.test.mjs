import assert from "node:assert/strict";
import test from "node:test";
import { getArticlePreview, sanitizeArticleHtml, previewReturnHref } from "../lib/article-preview.mjs";

test("Preview accepts Tiptap, Plate and legacy article formats", () => {
  const tiptap = getArticlePreview({ content_json: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Tiptap", marks: [{ type: "bold" }] }] }] } });
  assert.match(tiptap.html, /<p><strong>Tiptap<\/strong><\/p>/);
  const plate = getArticlePreview({ content_raw: JSON.stringify([{ type: "h1", children: [{ text: "Heading" }] }, { type: "p", children: [{ text: "Plate", italic: true }] }]) });
  assert.match(plate.html, /<h2>Heading<\/h2>/);
  assert.match(plate.html, /<em>Plate<\/em>/);
  const legacy = getArticlePreview({ blocks: [{ type: "heading_1", text: "Legacy" }, { type: "bullet_list", items: ["One", "Two"] }] });
  assert.match(legacy.html, /<h2>Legacy<\/h2>/);
  assert.match(legacy.html, /<ul><li>One<\/li><li>Two<\/li><\/ul>/);
  assert.equal(getArticlePreview({ content_raw: "<!-- wp:paragraph --><p>WordPress</p><!-- /wp:paragraph -->" }).html, "<p>WordPress</p>");
  assert.equal(getArticlePreview({ blocks: [] }).hasContent, false);
});

test("Preview removes scripts, event handlers, unsafe URLs and injected CSS", () => {
  const html = sanitizeArticleHtml('<script>alert(1)</script><p onclick="alert(1)" style="position:fixed;text-align:right">Safe</p><a href="javascript:alert(1)">Bad</a><img src="data:text/html,bad" onerror="alert(1)"><iframe src="https://attacker.test"></iframe>');
  assert.doesNotMatch(html, /script|onclick|onerror|javascript:|data:|iframe|position:fixed/);
  assert.match(html, /text-align:right/);
  assert.match(getArticlePreview({ blocks: [{ type: "text", text: "<script>literal</script>" }] }).html, /&lt;script&gt;/);
  const marks = getArticlePreview({ content_raw: JSON.stringify([{ type: "p", children: [{ text: "Link", linkUrl: "javascript:alert(1)" }] }]) });
  assert.doesNotMatch(marks.html, /javascript:/);
});

test("Preview keeps Arabic quotations, footnotes, media and document links", () => {
  const preview = getArticlePreview({ blocks: [
    { type: "ayah-quote", children: [{ text: "العلم" }] },
    { type: "image", src: "https://example.com/image.jpg", alt: "Image", children: [] },
    { type: "p", children: [{ text: "1", footnoteCitation: { id: "note1", author: "Author", title: "Source", year: "2026" } }] },
  ] });
  assert.match(preview.html, /dir="rtl" lang="ar"/);
  assert.match(preview.html, /https:\/\/example.com\/image.jpg/);
  assert.match(preview.html, /id="preview-footnote-1"/);
  assert.match(preview.html, /Author. 2026. Source/);
});

test("Closing preview only accepts a local article-list URL and preserves filters", () => {
  assert.equal(previewReturnHref("/artikel?status=draft&q=ilmu&page=2"), "/artikel?q=ilmu&status=draft&page=2");
  for (const target of ["https://evil.test/artikel", "//evil.test/artikel", "/auth/logout", "/artikel/1", undefined]) assert.equal(previewReturnHref(target), "/artikel");
});
