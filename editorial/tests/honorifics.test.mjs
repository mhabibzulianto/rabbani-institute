import test from "node:test";
import assert from "node:assert/strict";
import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { articleEditorExtensions } from "../lib/tiptap-extensions.mjs";
import { HONORIFICS, findHonorificSuggestion, honorificForShortcut } from "../lib/tiptap-honorifics.mjs";

const schema = getSchema(articleEditorExtensions());

function state(text) {
  const doc = schema.node("doc", null, [schema.node("paragraph", null, text ? [schema.text(text)] : undefined)]);
  return EditorState.create({ doc, selection: TextSelection.atEnd(doc) });
}

test("shortcut honorifik mencakup Allah, nabi, sahabat, dan ulama", () => {
  assert.equal(honorificForShortcut(":saw:"), "ﷺ");
  assert.equal(honorificForShortcut(":SWT:"), "سبحانه وتعالى");
  assert.equal(honorificForShortcut(":as:"), "عليه السلام");
  assert.equal(honorificForShortcut(":ra-f:"), "رضي الله عنها");
  assert.equal(honorificForShortcut(":rh:"), "رحمه الله");
  assert.equal(honorificForShortcut(":tidak-ada:"), null);
  assert.equal(new Set(HONORIFICS.map((item) => item.shortcut)).size, HONORIFICS.length);
});

test("saran honorifik muncul hanya setelah frasa pemicu di posisi kursor", () => {
  assert.equal(findHonorificSuggestion(state("Menurut Rasulullah"))?.text, "ﷺ");
  assert.equal(findHonorificSuggestion(state("Nabi Ibrahim"))?.text, "عليه السلام");
  assert.equal(findHonorificSuggestion(state("Allah"))?.text, "عز وجل");
  assert.equal(findHonorificSuggestion(state("Abu Bakar"))?.text, "رضي الله عنه");
  assert.equal(findHonorificSuggestion(state("Khadijah"))?.text, "رضي الله عنها");
  assert.equal(findHonorificSuggestion(state("Rasulullah bersabda")), null);
});
