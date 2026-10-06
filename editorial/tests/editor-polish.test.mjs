import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { articleEditorExtensions } from "../lib/tiptap-extensions.mjs";
import { cleanPastedHtml, slashQuery, matchingSlashCommands, documentOutline } from "../lib/editor-polish.mjs";
import { validateEditorDocument, serializeLegacyDocument } from "../lib/editor-document.mjs";

const schema = getSchema(articleEditorExtensions());
test("Paste cleans Word/Google Docs styles and unsafe content while keeping article structure", () => {
  const html = cleanPastedHtml('<h1 style="font-family:Calibri;color:red">Judul</h1><p class="MsoNormal" style="text-align:center;font-size:24px"><span style="font-weight:700">Tebal</span> <i>Miring</i> عربي</p><ol start="3"><li>Satu</li></ol><a href="javascript:alert(1)">unsafe</a><a href="https://example.com">safe</a><script>alert(1)</script><img src="data:image/png;base64,x" onerror="alert(1)"><iframe src="https://example.com"></iframe>');
  assert.match(html, /<h2>Judul<\/h2>/);
  assert.match(html, /<span style="font-weight:700">Tebal<\/span>/);
  assert.match(html, /<em>Miring<\/em> عربي/);
  assert.match(html, /text-align:center/);
  assert.match(html, /<ol start="3">/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.doesNotMatch(html, /Calibri|MsoNormal|font-size|javascript:|script|onerror|data:image|iframe/);
  const google = cleanPastedHtml('<b style="font-weight:normal"><p>Biasa <span style="font-weight:700;font-style:italic;font-family:Arial;color:red">Gabungan</span></p></b>');
  assert.doesNotMatch(google, /<strong>|Arial|color/);
  assert.match(google, /font-weight:700;font-style:italic/);
});
test("Slash commands trigger only from the start of a paragraph and filter commands", () => {
  const state = (text, selected=false) => {
    const doc = schema.nodeFromJSON({ type:"doc", content:[{type:"paragraph",content:[{type:"text",text}]}] });
    return EditorState.create({ schema, doc, selection:TextSelection.create(doc, selected ? 1 : text.length+1,text.length+1) });
  };
  assert.deepEqual(slashQuery(state("/heading")),{query:"heading",from:1,to:9});
  assert.equal(slashQuery(state("teks /heading")),null);
  assert.equal(slashQuery(state("/heading",true)),null);
  assert.equal(slashQuery(state("https://example.com")),null);
  assert.equal(matchingSlashCommands("heading").length,3);
  assert.equal(matchingSlashCommands("gambar")[0].id,"media");
});
test("Long documents retain outlines, Arabic, marks and edits through validation/export", () => {
  const content = [];
  for (let index=0;index<1200;index++) content.push(index % 4 === 0 ? {type:"heading",attrs:{level:2},content:[{type:"text",text:`Bagian ${index}`}]} : {type:"paragraph",content:[{type:"text",text:"Tulisan panjang untuk pengujian dokumen. العلم نور. ".repeat(3),marks:[{type:"bold"}]}]});
  const start = performance.now();
  let state = EditorState.create({ schema, doc:schema.nodeFromJSON({type:"doc",content}) });
  assert.equal(documentOutline(state.doc).length,300);
  for (let index=0;index<50;index++) state = state.apply(state.tr.insertText("a",1));
  const json = validateEditorDocument(state.doc.toJSON());
  assert.equal(json.content.length,1200);
  assert.match(JSON.stringify(serializeLegacyDocument(json)),/العلم نور/);
  assert.equal(documentOutline(state.doc)[0].position,0);
  assert.ok(performance.now()-start < 10000,"Long-document editing should complete within ten seconds");
});
