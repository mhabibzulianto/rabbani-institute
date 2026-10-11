import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import { normalizeQuranVerse, quranSelection, validateQuranRange } from "../lib/quran-selection.mjs";
import { validateEditorDocument, serializeLegacyDocument, prepareEditorDocument } from "../lib/editor-document.mjs";
import { getArticlePreview } from "../lib/article-preview.mjs";
const fixture = key => JSON.parse(readFileSync(new URL("./fixtures/quran-" + key + ".json", import.meta.url), "utf8"));
const chapters = JSON.parse(readFileSync(new URL("../lib/quran-chapters.json", import.meta.url), "utf8"));
const chapter = chapters[1];
const verses = [255, 256].map(n => normalizeQuranVerse(fixture("2-" + n), 2, n));

test("surah catalog and ranges validate counts, order and request bounds", () => {
  assert.equal(chapters.length, 114); assert.equal(chapters.reduce((n,c) => n+c.verses, 0), 6236);
  assert.deepEqual(validateQuranRange(chapter, "255", "256"), { from: 255, to: 256 });
  for (const pair of [[0, 1], [2, 1], [1, 287], [1, 21], [1.5, 2], ["", ""], [NaN, 3]]) assert.throws(() => validateQuranRange(chapter, ...pair));
});
test("alignment retains original harakat and stop signs despite word annotations", () => {
  assert.equal(verses[0].words.length, 50);
  const full = quranSelection(chapter, verses);
  assert.equal(full.texts[0], verses[0].text + " ﴿٢٥٥﴾");
  assert.equal(full.reference, "QS. Al-Baqarah [2]: 255–256");
  assert.ok(!full.cropped); assert.ok(!JSON.stringify(full).includes("translation"));
  const slice = quranSelection(chapter, [verses[0]], true, 1, 7);
  assert.ok(slice.texts[0].includes("ۚ")); assert.ok(slice.texts[0].includes("…"));
  assert.equal(slice.reference, "QS. Al-Baqarah [2]: 255 (potongan ayat)");
  assert.throws(() => normalizeQuranVerse(fixture("2-255"), 2, 256));
  const bad = fixture("2-255"); bad.words[0].text_uthmani = "نص خاطئ";
  assert.throws(() => normalizeQuranVerse(bad, 2, 255));
});
test("partial ranges crop only the first and last verse and reject invalid boundaries", () => {
  const slice = quranSelection(chapter, verses, true, 10, 4);
  assert.ok(slice.texts[0].startsWith("… " + verses[0].words[9].text));
  assert.ok(slice.texts[1].endsWith("… ﴿٢٥٦﴾"));
  assert.equal(quranSelection(chapter, [verses[0]], true, 1, 50).cropped, false);
  for (const pair of [[0, 2], [4, 2], [1, 51], [1.1, 2]]) assert.throws(() => quranSelection(chapter, [verses[0]], true, ...pair));
  assert.throws(() => quranSelection(chapter, [verses[0], { ...verses[1], number: 257 }]));
});
test("verses and reference are editable text and round-trip through publication", () => {
  const selected = quranSelection(chapter, verses, true, 2, 10);
  const doc = validateEditorDocument({ type: "doc", content: selected.content });
  assert.equal(doc.content[0].type, "arabicBlock");
  assert.equal(doc.content[0].content[0].content[0].type, "text");
  doc.content[0].content[0].content[0].text += " تعديل";
  doc.content[1].content[0].text += " — مرجع";
  const legacy = serializeLegacyDocument(doc);
  assert.deepEqual(prepareEditorDocument({ blocks: legacy.blocks }).content, doc);
  const html = getArticlePreview(legacy).html;
  assert.match(html, /dir="rtl" lang="ar"/); assert.match(html, /تعديل/); assert.match(html, /potongan ayat/);
});
test("route enforces editorial access, request bounds and strips translations", async () => {
  const filename = fileURLToPath(new URL("../app/api/editorial/quran/route.js", import.meta.url));
  const require = createRequire(filename), ts = require("typescript");
  let identity = { user: null, profile: null }, calls = 0;
  const mod = new Module(filename); mod.filename = filename; mod.paths = Module._nodeModulePaths(fileURLToPath(new URL("..", import.meta.url)));
  mod.require = name => {
    if (name === "next/server") return { NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200 }) } };
    if (name === "@/lib/supabase/server") return { getCurrentUser: async () => identity };
    if (name === "@/lib/access.mjs") return { canAccessEditorial: profile => ["admin", "instructor"].includes(profile?.role) || profile?.is_writer === true };
    if (name === "@/lib/quran-chapters.json") return chapters;
    if (name === "@/lib/quran-selection.mjs") return { validateQuranRange, normalizeQuranVerse };
    throw new Error("Unexpected import: " + name);
  };
  mod._compile(ts.transpileModule(readFileSync(filename,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  const before = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls++; assert.equal(options.next.revalidate, 86400); assert.ok(options.signal);
    assert.ok(url.startsWith("https://api.quran.com/api/v4/verses/by_key/"));
    return { ok: true, json: async () => ({ verse: fixture(url.includes("2:255") ? "2-255" : "2-256") }) };
  };
  try {
    const request = (query = "chapter=2&from=255&to=256") => new Request("http://localhost/api/editorial/quran?" + query);
    assert.equal((await mod.exports.GET(request())).status, 403); assert.equal(calls, 0);
    identity = { user: { id: "writer" }, profile: { is_writer: true } };
    assert.equal((await mod.exports.GET(request("chapter=2&from=1&to=21"))).status, 400); assert.equal(calls, 0);
    const result = await mod.exports.GET(request());
    assert.equal(result.status, 200); assert.equal(result.data.verses.length, 2); assert.equal(calls, 2);
    assert.ok(!JSON.stringify(result.data).includes("translation"));
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.equal((await mod.exports.GET(request())).status, 502);
  } finally { globalThis.fetch = before; }
});
