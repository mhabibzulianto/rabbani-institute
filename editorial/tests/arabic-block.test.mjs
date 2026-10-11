import test from "node:test";
import assert from "node:assert/strict";
import { validateEditorDocument, serializeLegacyDocument, prepareEditorDocument } from "../lib/editor-document.mjs";
import { getArticlePreview } from "../lib/article-preview.mjs";
import { cleanPastedHtml, matchingSlashCommands } from "../lib/editor-polish.mjs";

const doc = { type: "doc", content: [
  { type: "paragraph", content: [{ type: "text", text: "Pengantar" }] },
  { type: "arabicBlock", content: [
    { type: "paragraph", content: [{ type: "text", text: "بِسْمِ اللَّهِ", marks: [{ type: "bold" }] }, { type: "footnote", attrs: { id: "fn-arabic", text: "Sumber catatan" } }] },
    { type: "paragraph", content: [{ type: "text", text: "الرَّحْمَٰنِ الرَّحِيمِ" }] }
  ] }
] };
test("Arabic text and footnotes round-trip through storage and public serialization", () => {
  const normalized = validateEditorDocument(doc);
  const legacy = serializeLegacyDocument(normalized);
  assert.equal(legacy.blocks[1].type, "arabic-text");
  assert.deepEqual(prepareEditorDocument({ blocks: legacy.blocks }).content, normalized);
  for (const source of [{ content_json: normalized }, legacy]) {
    const html = getArticlePreview(source).html;
    assert.match(html, /class="preview-arabic" dir="rtl" lang="ar"/);
    assert.ok(html.includes("<strong>بِسْمِ اللَّهِ</strong>"));
    assert.match(html, /الرَّحْمَٰنِ الرَّحِيمِ/);
    assert.match(html, /Sumber catatan/);
  }
});
test("Arabic-only documents also serialize as a dedicated public block", () => {
  const plain = structuredClone(doc);
  plain.content[1].content[0].content.pop();
  assert.equal(serializeLegacyDocument(plain).blocks[1].type, "arabic-text");
  assert.throws(() => validateEditorDocument({ type: "doc", content: [{ type: "arabicBlock", attrs: { dir: "ltr" }, content: [{ type: "paragraph" }] }] }));
});
test("clipboard preserves RTL blocks and formatting while removing arbitrary attributes", () => {
  const html = cleanPastedHtml('<div data-arabic-block dir="ltr" lang="en" onclick="evil()"><p><strong>السلام عليكم</strong></p></div>');
  assert.match(html, /data-arabic-block/); assert.match(html, /dir="rtl"/); assert.match(html, /lang="ar"/);
  assert.ok(html.includes("<strong>السلام عليكم</strong>")); assert.ok(!html.includes("onclick"));
  assert.deepEqual(matchingSlashCommands("arabic").map(item => item.command), ["toggleArabicBlock"]);
});
