import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";
import { readLandingBody } from "../../packages/landing-page/request-body.mjs";
import { landingHeadings } from "../../packages/landing-page/headings.mjs";
import { createDefaultLandingDocument } from "../../packages/landing-page/index.mjs";
import { validateLandingPublication } from "../../packages/landing-page/publication.mjs";

function streamed(chunks) {
  let index = 0;
  let canceled = false;
  return { request: { headers: new Headers(), body: new ReadableStream({ pull(controller) { if (index === chunks.length) controller.close(); else controller.enqueue(new TextEncoder().encode(chunks[index++])); }, cancel() { canceled = true; } }) }, canceled: () => canceled };
}
test("body limit counts streamed UTF-8 bytes and cancels oversized requests without Content-Length", async () => {
  assert.equal(await readLandingBody(streamed(["ticket=", "a".repeat(64)]).request), "ticket=" + "a".repeat(64));
  assert.equal(await readLandingBody(streamed(["a".repeat(1024)]).request), "a".repeat(1024));
  const large = streamed(["a".repeat(1000), "é".repeat(20), "ignored"]);
  await assert.rejects(readLandingBody(large.request), RangeError);
  assert.equal(large.canceled(), true);
  await assert.rejects(readLandingBody({ headers: new Headers({ "content-length": "1025" }) }), RangeError);
});
test("rich heading levels never skip the section hierarchy and leave the stored draft intact", () => {
  const node = { type: "doc", content: [4, 4, 2, 4].map(level => ({ type: "heading", attrs: { level }, content: [{ type: "text", text: "Heading" }] })) };
  assert.deepEqual(landingHeadings(node, 2).content.map(n => n.attrs.level), [3, 4, 3, 4]);
  assert.deepEqual(landingHeadings(node).content.map(n => n.attrs.level), [2, 3, 2, 3]);
  assert.equal(node.content[0].attrs.level, 4);
});
test("publication rejects fragment-only media and whitespace-only required text", () => {
  for (const change of [doc => doc.seo.image = "#image", doc => doc.blocks[0].props.image = { src: "#image" }, doc => doc.seo.description = "\t\n\u00a0"]) {
    const doc = createDefaultLandingDocument(); change(doc);
    assert.throws(() => validateLandingPublication(doc));
  }
});

test("renderer escapes content, rejects unsafe links, keeps one H1 and renders accessible headings", () => {
  const filename = fileURLToPath(new URL("../../packages/landing-page/Renderer.jsx", import.meta.url));
  const require = createRequire(filename);
  const ts = require("typescript");
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(filename); mod.filename = filename; mod.paths = Module._nodeModulePaths(fileURLToPath(new URL("../../packages/landing-page", import.meta.url)));
  mod._compile(compiled, filename);
  const React = require("react");
  const doc = createDefaultLandingDocument();
  doc.blocks.push({ ...structuredClone(doc.blocks[0]), id: "another-hero" });
  doc.blocks[0].props.buttons.push({ label: "Unsafe", href: "javascript:alert(1)" });
  doc.blocks.push({ id: "test-text", type: "text", enabled: true, props: { title: "Cerita", content: { type: "doc", content: [{ type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "<script>alert(1)</script>" }] }] } } });
  const html = require("react-dom/server").renderToStaticMarkup(React.createElement(mod.exports.default, { document: doc }));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.ok(html.includes("<h3>&lt;script&gt;"));
  assert.ok(!html.includes("javascript:"));
  assert.ok(!html.includes("<script>"));
});
