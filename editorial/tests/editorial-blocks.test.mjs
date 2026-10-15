import test from "node:test";
import assert from "node:assert/strict";
import { validateEditorDocument, serializeLegacyDocument, prepareEditorDocument } from "../lib/editor-document.mjs";
import { getArticlePreview } from "../lib/article-preview.mjs";
import { matchingSlashCommands } from "../lib/editor-polish.mjs";

const document = { type: "doc", content: [
  { type: "pullQuote", content: [{ type: "paragraph", content: [{ type: "text", text: "Kutipan utama" }] }] },
  { type: "marginalia", content: [{ type: "paragraph", content: [{ type: "text", text: "Catatan samping" }] }] },
] };

test("pull quote dan marginalia tervalidasi serta round-trip ke format publik", () => {
  const normalized = validateEditorDocument(document);
  const legacy = serializeLegacyDocument(normalized);
  assert.deepEqual(legacy.blocks.map((block) => block.type), ["pull-quote", "marginalia"]);
  assert.deepEqual(prepareEditorDocument({ blocks: legacy.blocks }).content, normalized);
  const html = getArticlePreview(legacy).html;
  assert.match(html, /class="preview-pull-quote"/);
  assert.match(html, /class="preview-marginalia"/);
});

test("pull quote dan marginalia tersedia di menu slash", () => {
  assert.deepEqual(matchingSlashCommands("pull").map((item) => item.command), ["setPullQuote"]);
  assert.deepEqual(matchingSlashCommands("marginalia").map((item) => item.command), ["setMarginalia"]);
});
