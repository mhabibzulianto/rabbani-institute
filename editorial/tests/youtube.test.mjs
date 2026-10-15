import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import { youtubeEmbedUrl } from "../../packages/article-youtube/index.mjs";
import { validateEditorDocument, serializeLegacyDocument, prepareEditorDocument } from "../lib/editor-document.mjs";
import { getArticlePreview, sanitizeArticleHtml } from "../lib/article-preview.mjs";
import { cleanPastedHtml } from "../lib/editor-polish.mjs";

const id = "M7lc1UVf-VE";
const src = `https://www.youtube-nocookie.com/embed/${id}`;
const document = { type: "doc", content: [{ type: "youtube", attrs: { src } }] };

test("YouTube long, short, Shorts, live and embed URLs normalize without tracking or autoplay", () => {
  for (const input of [`https://www.youtube.com/watch?v=${id}&list=ignored`, `https://youtu.be/${id}?si=ignored`, `youtube.com/watch?v=${id}`, `https://m.youtube.com/watch?v=${id}`, `https://youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`, `https://www.youtube.com/embed/${id}?autoplay=1`, src]) assert.equal(youtubeEmbedUrl(input), src);
  assert.equal(youtubeEmbedUrl(`https://youtu.be/${id}?t=1m30s`), `${src}?start=90`);
  assert.equal(youtubeEmbedUrl(`https://youtube.com/watch?v=${id}&t=90`), `${src}?start=90`);
  assert.equal(youtubeEmbedUrl(`${src}?start=90`), `${src}?start=90`);
  for (const input of [`https://youtube.com.evil.test/watch?v=${id}`, `https://evil.test/${id}`, `https://youtube.com@evil.test/watch?v=${id}`, `https://user:pass@youtube.com/watch?v=${id}`, `https://youtube.com:444/watch?v=${id}`, "javascript:alert(1)", "//youtube.com/watch?v=" + id, "https://youtube.com/playlist?list=123", "https://youtu.be/invalid", `https://youtu.be/${id}/extra`, "<iframe src='x'></iframe>"]) assert.equal(youtubeEmbedUrl(input), null);
});

test("YouTube saves, reloads, exports and renders safely in both document formats", () => {
  assert.deepEqual(validateEditorDocument(document), document);
  const legacy = serializeLegacyDocument(document);
  assert.equal(legacy.blocks[0].type, "youtube");
  assert.deepEqual(prepareEditorDocument({ blocks: legacy.blocks }).content, document);
  assert.deepEqual(prepareEditorDocument({ content_json: document }).content, document);
  for (const article of [{ content_json: document }, legacy]) {
    const preview = getArticlePreview(article);
    assert.equal(preview.hasContent, true);
    assert.match(preview.html, /class="preview-youtube"/);
    assert.ok(preview.html.includes(src));
    assert.match(preview.html, /allowfullscreen/);
    assert.match(preview.html, /referrerpolicy="strict-origin-when-cross-origin"/);
  }
  assert.throws(() => validateEditorDocument({ type: "doc", content: [{ type: "youtube", attrs: { src: "https://evil.test" } }] }));
  assert.throws(() => validateEditorDocument({ type: "doc", content: [{ type: "youtube", attrs: { src, onload: "alert(1)" } }] }));
});

test("Only validated YouTube iframes survive preview sanitization and clipboard cleanup", () => {
  for (const sanitize of [sanitizeArticleHtml, cleanPastedHtml]) {
    const html = sanitize(`<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" onload="alert(1)" srcdoc="evil" allow="camera; microphone"></iframe><iframe src="https://evil.test"></iframe>`);
    assert.ok(html.includes(src));
    assert.equal((html.match(/<iframe/g) || []).length, 1);
    for (const unsafe of ["evil", "onload", "srcdoc", "camera", "microphone", "autoplay"]) assert.ok(!html.includes(unsafe));
  }
});

test("Public React article reader renders responsive YouTube embeds and rejects arbitrary hosts", () => {
  const filename = fileURLToPath(new URL("../../components/ArticleRenderer.js", import.meta.url));
  const require = createRequire(filename);
  const ts = require("typescript");
  const compile = file => {
    const mod = new Module(file); mod.filename = file; mod.paths = Module._nodeModulePaths(fileURLToPath(new URL("../../components", import.meta.url)));
    const originalRequire = mod.require.bind(mod);
    mod.require = name => name.startsWith("@/lib/") ? compile(fileURLToPath(new URL(`../../lib/${name.slice(6)}.js`, import.meta.url))) : originalRequire(name);
    mod._compile(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
    return mod.exports;
  };
  const React = require("react");
  const render = blocks => require("react-dom/server").renderToStaticMarkup(React.createElement(compile(filename).default, { contentRaw: JSON.stringify(blocks) }));
  const html = render(serializeLegacyDocument(document).blocks);
  assert.match(html, /article-youtube-block/);
  assert.ok(html.includes(src));
  assert.match(html, /allowFullScreen|allowfullscreen/);
  assert.ok(!render([{ type: "youtube", src: "https://evil.test", children: [{ text: "" }] }]).includes("<iframe"));
});
