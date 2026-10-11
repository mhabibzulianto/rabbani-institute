import test from "node:test";
import assert from "node:assert/strict";
import { newArticleSlug, normalizeNewArticlePayload } from "../lib/new-article.mjs";

const input = { creationKey: "b0a8c54b-9e7f-4b6e-9ac0-0dddfdca1378", title: "", excerpt: "", topic: "", tags: "", category: "", cover: "", doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Tulisan pertama" }] }] } };

test("new draft supports body-first writing and a stable retry identity", () => {
  const payload = normalizeNewArticlePayload(input);
  assert.equal(payload.title, "Tanpa judul");
  assert.equal(payload.content_json.content[0].content[0].text, "Tulisan pertama");
  assert.equal(newArticleSlug(input.creationKey), newArticleSlug(input.creationKey.toUpperCase()));
  assert.equal(normalizeNewArticlePayload({ ...input, title: " Artikel baru " }).title, "Artikel baru");
});

test("new drafts enforce the existing editor validation", () => {
  assert.throws(() => normalizeNewArticlePayload({ ...input, creationKey: "../bad" }));
  assert.throws(() => normalizeNewArticlePayload({ ...input, title: "x".repeat(201) }));
  assert.throws(() => normalizeNewArticlePayload({ ...input, doc: { type: "doc", content: [{ type: "script" }] } }));
  assert.throws(() => normalizeNewArticlePayload({ ...input, cover: "javascript:alert(1)" }));
});
