import { Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Fragment, Slice } from "@tiptap/pm/model";
import { validFootnoteId } from "../../packages/article-footnotes/index.mjs";

export const newFootnoteId = () => `fn-${crypto.randomUUID()}`;
export function editorFootnotes(doc) {
  const notes = [];
  doc.descendants((node, pos) => { if (node.type.name === "footnote") notes.push({ ...node.attrs, pos, number: notes.length + 1 }); });
  return notes;
}
function decorations(doc) {
  return DecorationSet.create(doc, editorFootnotes(doc).map(note => Decoration.node(note.pos, note.pos + 1, { "data-footnote-number": String(note.number), "aria-label": `Catatan kaki ${note.number}` })));
}
export const Footnote = Node.create({
  name: "footnote", group: "inline", inline: true, atom: true, selectable: true, marks: "",
  addAttributes() { return {
    id: { default: null, rendered: false, parseHTML: element => element.getAttribute("data-footnote-id") },
    text: { default: "", rendered: false, parseHTML: element => element.getAttribute("data-footnote-text") || "" },
  }; },
  parseHTML() { return [{ tag: "sup[data-footnote-id][data-footnote-text]" }]; },
  renderHTML({ node }) { return ["sup", { "data-footnote-id": node.attrs.id, "data-footnote-text": node.attrs.text, role: "button", tabindex: "0", class: "writing-footnote-marker" }, ["span", { class: "writing-footnote-fallback" }, "*"]]; },
  addProseMirrorPlugins() { return [new Plugin({
    key: new PluginKey("articleFootnotes"),
    state: { init: (_, state) => decorations(state.doc), apply: (tr, previous) => tr.docChanged ? decorations(tr.doc) : previous },
    props: {
      decorations(state) { return this.getState(state); },
      transformPasted(slice, view) {
        const seen = new Set(view?.dragging?.move ? [] : editorFootnotes(view?.state.doc || { descendants() {} }).map(note => note.id));
        const clone = (fragment) => Fragment.from(fragment.content.map(node => {
          if (node.type.name !== "footnote") return node.copy(clone(node.content));
          const id = validFootnoteId(node.attrs.id) && !seen.has(node.attrs.id) ? node.attrs.id : newFootnoteId();
          seen.add(id);
          return node.type.create({ ...node.attrs, id });
        }));
        return new Slice(clone(slice.content), slice.openStart, slice.openEnd);
      },
    },
    appendTransaction(transactions, oldState, state) {
      if (!transactions.some(tr => tr.docChanged)) return null;
      const seen = new Set(); const tr = state.tr;
      for (const note of editorFootnotes(state.doc)) {
        if (!validFootnoteId(note.id) || seen.has(note.id)) tr.setNodeMarkup(note.pos, undefined, { id: newFootnoteId(), text: note.text });
        else seen.add(note.id);
      }
      return tr.docChanged ? tr : null;
    },
  })]; },
});
