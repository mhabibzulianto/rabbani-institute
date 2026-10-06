import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { cleanPastedHtml, slashQuery } from "./editor-polish.mjs";

export const EditorPolish = Extension.create({
  name: "editorPolish",
  addOptions() { return { onSlash: () => {}, onSlashKey: () => false, onPasteNotice: () => {} }; },
  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;
    return [new Plugin({
      key: new PluginKey("editorialPolish"),
      props: {
        transformPastedHTML: (html) => html.length > 500000 ? "" : cleanPastedHtml(html),
        handlePaste(view, event) {
          if (event.clipboardData?.files.length) { options.onPasteNotice("Gunakan menu Media untuk mengunggah gambar atau file dari clipboard."); return true; }
          const raw = event.clipboardData?.getData("text/html") || event.clipboardData?.getData("text/plain") || "";
          if (raw.length > 500000) { options.onPasteNotice("Tempelan terlalu besar. Tempelkan tulisan dalam beberapa bagian (maksimal 500 KB). "); return true; }
          return false;
        },
        handleKeyDown(view, event) { return editor.isEditable && !event.isComposing && slashQuery(view.state) ? options.onSlashKey(event) : false; },
      },
      view(view) {
        let previous = "";
        const update = () => {
          const next = editor.isEditable ? slashQuery(view.state) : null;
          const key = JSON.stringify(next);
          if (key !== previous) { previous = key; options.onSlash(next); }
        };
        update();
        return { update, destroy() { options.onSlash(null); } };
      },
    })];
  },
});
