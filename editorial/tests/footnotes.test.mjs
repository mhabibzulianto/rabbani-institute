import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { Slice } from "@tiptap/pm/model";
import { articleEditorExtensions } from "../lib/tiptap-extensions.mjs";
import { Footnote, editorFootnotes } from "../lib/tiptap-footnotes.mjs";
import { validateEditorDocument, serializeLegacyDocument, prepareEditorDocument } from "../lib/editor-document.mjs";
import { getArticlePreview } from "../lib/article-preview.mjs";
import { cleanPastedHtml } from "../lib/editor-polish.mjs";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
const schema = getSchema(articleEditorExtensions());
const note = (id, text) => ({ type: "footnote", attrs: { id, text } });
const document = (notes = [note("fn-one", "Kitab pertama, hlm. 12"), note("fn-two", "Sumber https://example.com/path.\n<script>alert(1)</script>")]) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Tulisan" }, ...notes] }] });

test("footnotes round-trip through editor JSON, legacy publication and sanitized preview", () => {
  const doc = validateEditorDocument(document());
  const legacy = serializeLegacyDocument(doc);
  assert.equal(legacy.blocks[0].children[1].footnoteCitation.number, 1);
  assert.equal(legacy.blocks[0].children[2].footnoteCitation.text, doc.content[0].content[2].attrs.text);
  assert.deepEqual(prepareEditorDocument({ blocks: legacy.blocks }).content, doc);
  for (const article of [{ content_json: doc }, legacy]) {
    const html = getArticlePreview(article).html;
    assert.match(html, /Catatan kaki/); assert.match(html, /Kitab pertama/);
    assert.match(html, /href="#preview-footnote-1"/); assert.match(html, /href="https:\/\/example.com\/path"/);
    assert.ok(!html.includes("<script>")); assert.match(html, /&lt;script&gt;/);
  }
});
test("footnote validator rejects duplicate IDs, empty/oversized text, HTML attrs and excess notes", () => {
  for (const notes of [[note("fn-one", " ")], [note("bad id", "Isi")], [note("fn-one", "x".repeat(4001))], [note("fn-one", "Isi"), note("fn-one", "Duplikat")], [{ type: "footnote", attrs: { id: "fn-one", text: "Isi", onclick: "alert(1)" } }], Array.from({ length: 201 }, (_, i) => note(`fn-${i}`, "Isi"))]) assert.throws(() => validateEditorDocument(document(notes)));
});
test("numbering follows document order after move/delete, without changing IDs or storing numbers", () => {
  const first = schema.nodeFromJSON(document());
  const reversed = schema.nodeFromJSON(document([note("fn-two", "Kedua"), note("fn-one", "Pertama")]));
  assert.deepEqual(editorFootnotes(first).map(n => [n.id, n.number]), [["fn-one", 1], ["fn-two", 2]]);
  assert.deepEqual(editorFootnotes(reversed).map(n => [n.id, n.number]), [["fn-two", 1], ["fn-one", 2]]);
  const state = EditorState.create({ schema, doc: reversed });
  const position = editorFootnotes(state.doc)[0].pos;
  const deleted = state.apply(state.tr.delete(position, position + 1));
  assert.deepEqual(editorFootnotes(deleted.doc).map(n => [n.id, n.number]), [["fn-one", 1]]);
  assert.equal(deleted.doc.toJSON().content[0].content.at(-1).attrs.number, undefined);
});
test("clipboard copies get new IDs and duplicate transactions are repaired", () => {
  const plugin = Footnote.config.addProseMirrorPlugins.call(Footnote)[0];
  const doc = schema.nodeFromJSON(document());
  const pasted = plugin.props.transformPasted(new Slice(doc.content, 0, 0), { state: { doc } });
  const original = editorFootnotes(doc), copies = editorFootnotes(schema.node("doc", null, pasted.content));
  assert.notEqual(copies[0].id, original[0].id); assert.equal(copies[0].text, original[0].text);
  const moved = plugin.props.transformPasted(new Slice(doc.content, 0, 0), { state: { doc }, dragging: { move: true } });
  assert.equal(editorFootnotes(schema.node("doc", null, moved.content))[0].id, original[0].id);
  const state = EditorState.create({ schema, doc, plugins: [plugin] });
  const duplicate = state.applyTransaction(state.tr.insert(original[0].pos, schema.nodes.footnote.create({ id: original[0].id, text: "Salinan" }))).state;
  const ids = editorFootnotes(duplicate.doc).map(n => n.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(cleanPastedHtml('<p>Teks<sup data-footnote-id="fn-one" data-footnote-text="Catatan" onclick="evil()">*</sup></p>'), /data-footnote-text="Catatan"/);
  assert.ok(!cleanPastedHtml('<sup data-footnote-id="fn-one" data-footnote-text="Catatan" onclick="evil()">*</sup>').includes("onclick"));
});

test("public React reader renders notes and safe links before evaluating child components", () => {
  const filename = fileURLToPath(new URL("../../components/ArticleRenderer.js", import.meta.url));
  const require = createRequire(filename); const ts = require("typescript");
  const compile = (file) => {
    const mod = new Module(file); mod.filename = file; mod.paths = Module._nodeModulePaths(fileURLToPath(new URL("../../components", import.meta.url)));
    const originalRequire = mod.require.bind(mod);
    mod.require = name => name.startsWith("@/lib/") ? compile(fileURLToPath(new URL(`../../lib/${name.slice(6)}.js`, import.meta.url))) : originalRequire(name);
    mod._compile(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
    return mod.exports;
  };
  const React = require("react");
  const legacy = serializeLegacyDocument({ type: "doc", content: [{ type: "arabicBlock", content: document().content }] });
  const html = require("react-dom/server").renderToStaticMarkup(React.createElement(compile(filename).default, { contentRaw: legacy.content_raw, blocks: legacy.blocks }));
  assert.match(html, /class="article-arabic-text" dir="rtl" lang="ar"/);
  assert.match(html, /Catatan kaki/); assert.match(html, /Kitab pertama/);
  assert.match(html, /href="#fn-one"/); assert.match(html, /href="https:\/\/example.com\/path"/);
  assert.ok(!html.includes("<script>")); assert.ok(!html.includes("Anon."));
});
