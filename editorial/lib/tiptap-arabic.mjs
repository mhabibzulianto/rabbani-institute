import { Node } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

export const ArabicBlock = Node.create({
  name: "arabicBlock",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() { return [{ tag: "div[data-arabic-block]" }]; },
  renderHTML() { return ["div", { "data-arabic-block": "", class: "writing-arabic-block", dir: "rtl", lang: "ar" }, 0]; },
  addCommands() {
    return {
      toggleArabicBlock: () => ({ commands }) => commands.toggleWrap(this.name),
      exitArabicBlock: () => ({ state, tr, dispatch }) => {
        const { $from } = state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name !== this.name) continue;
          if (dispatch) {
            const after = $from.after(depth);
            tr.insert(after, state.schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1))).scrollIntoView();
          }
          return true;
        }
        return false;
      },
    };
  },
  addKeyboardShortcuts() { return { "Mod-Enter": () => this.editor.commands.exitArabicBlock() }; },
});

export const QuranBlock = Node.create({
  name: "quranBlock",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() { return [{ tag: "div[data-quran-block]" }, { tag: "blockquote[data-quran-block]" }]; },
  renderHTML() { return ["div", { "data-quran-block": "", class: "writing-quran-block", dir: "rtl", lang: "ar" }, 0]; },
});
