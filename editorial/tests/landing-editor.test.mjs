import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { createDefaultLandingDocument, validateLandingDocument } from "../lib/landing-document.mjs";
import { BLOCK_LABELS, createLandingBlock, moveLandingBlock, createLandingSaveQueue, normalizeLandingRichText, landingSaveAcknowledgement } from "../lib/landing-editor.mjs";

test("RPC acknowledgement supports PostgREST composite rows and fails closed on an uncertain write", () => {
  const row = { draft_version: 3, updated_at: "2026-10-08T12:00:00Z" };
  assert.deepEqual(landingSaveAcknowledgement(row, 2), { ok: true, version: 3, updatedAt: row.updated_at });
  assert.equal(landingSaveAcknowledgement([row], 2).ok, true);
  for (const data of [null, [], [row, row], {}, { draft_version: "3" }, { draft_version: 7 }]) {
    assert.equal(landingSaveAcknowledgement(data, 2).conflict, true);
  }
});

test("Every new block can be saved; reorder and duplicates keep stable unique identity", () => {
  const doc = createDefaultLandingDocument();
  for (const type of Object.keys(BLOCK_LABELS)) doc.blocks.push(createLandingBlock(type, `new-${type}`));
  assert.equal(validateLandingDocument(doc).blocks.length, 15);
  const original = doc.blocks.map((b) => b.id);
  const moved = moveLandingBlock(doc, original[0], 4);
  assert.equal(moved.blocks[4].id, original[0]);
  assert.deepEqual(doc.blocks.map((b) => b.id), original);
  assert.equal(moveLandingBlock(doc, "missing", 0), doc);
  const copy = { ...structuredClone(doc.blocks[0]), id: "copy" };
  copy.props.title = "Copy changed";
  assert.notEqual(doc.blocks[0].props.title, copy.props.title);
  assert.doesNotThrow(() => validateLandingDocument({ ...doc, blocks: [...doc.blocks, copy] }));
});

test("Rich text strips editor defaults and preserves Arabic, headings, lists, and safe link marks", () => {
  const schema = getSchema([StarterKit.configure({ heading: { levels: [2, 3, 4] }, code: false, codeBlock: false, blockquote: false, horizontalRule: false, underline: false })]);
  const raw = schema.nodeFromJSON({ type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "العلم نور", marks: [{ type: "bold" }, { type: "link", attrs: { href: "https://example.com", target: "_blank", rel: "noopener noreferrer" } }] }] }, { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] }] }).toJSON();
  const normalized = normalizeLandingRichText(raw);
  assert.equal(normalized.content[0].content[0].text, "العلم نور");
  assert.deepEqual(normalized.content[0].content[0].marks.find((mark) => mark.type === "link").attrs, { href: "https://example.com" });
  const doc = createDefaultLandingDocument(); doc.blocks.push({ id: "rich", type: "text", enabled: true, props: { content: normalized } });
  assert.doesNotThrow(() => validateLandingDocument(doc));
});

test("Autosave serializes overlapping requests and saves edits made during an older request", async () => {
  const doc = createDefaultLandingDocument();
  const requests = [], states = [];
  let release;
  const queue = createLandingSaveQueue({ document: doc, version: 7, onChange: (s) => states.push(s), save: async (payload) => {
    requests.push(payload);
    if (requests.length === 1) await new Promise((resolve) => { release = resolve; });
    return { ok: true, version: payload.version + 1 };
  } });
  const first = structuredClone(doc); first.blocks[0].props.title = "First"; queue.update(first);
  const saving = queue.flush();
  const second = structuredClone(first); second.blocks[0].props.title = "Second"; queue.update(second);
  const overlapping = queue.flush();
  assert.equal(requests.length, 1); assert.equal(queue.dirty, true);
  release(); await Promise.all([saving, overlapping]);
  assert.deepEqual(requests.map((r) => r.version), [7, 8]);
  assert.deepEqual(requests.map((r) => r.document.blocks[0].props.title), ["First", "Second"]);
  assert.equal(queue.version, 9); assert.equal(queue.dirty, false);
  assert.equal(states.at(-1).state, "saved");
});

test("Network failure retains draft for retry; conflicts stop writes; invalid content never reaches server", async () => {
  const doc = createDefaultLandingDocument(), next = structuredClone(doc); next.blocks[0].props.title = "Unsaved";
  let calls = 0;
  const queue = createLandingSaveQueue({ document: doc, version: 1, save: async () => { if (++calls === 1) throw new Error("Offline"); return { ok: true, version: 2 }; } });
  queue.update(next); assert.equal(await queue.flush(), false); assert.equal(queue.version, 1); assert.equal(queue.dirty, true);
  assert.equal(await queue.flush(), true); assert.equal(queue.dirty, false);
  calls = 0;
  const conflict = createLandingSaveQueue({ document: doc, version: 1, save: async () => { calls++; return { ok: false, conflict: true, error: "Changed" }; } });
  conflict.update(next); await conflict.flush(); await conflict.flush();
  assert.equal(calls, 1); assert.equal(conflict.dirty, true);
  calls = 0;
  const invalid = createLandingSaveQueue({ document: doc, version: 1, save: async () => { calls++; } });
  next.blocks[0].props.buttons[0].href = "javascript:alert(1)";
  invalid.update(next); assert.equal(await invalid.flush(), false); assert.equal(calls, 0); assert.equal(invalid.dirty, true);
});
