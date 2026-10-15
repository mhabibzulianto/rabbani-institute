import { Node } from "@tiptap/core";

function editorialBlock({ name, tag, attribute, className }) {
  return Node.create({
    name,
    group: "block",
    content: "paragraph+",
    defining: true,
    parseHTML() { return [{ tag: `${tag}[${attribute}]` }]; },
    renderHTML() { return [tag, { [attribute]: "", class: className }, 0]; },
    addCommands() {
      return {
        [`set${name[0].toUpperCase()}${name.slice(1)}`]: () => ({ commands }) => commands.setParagraph() && commands.wrapIn(name),
      };
    },
    addKeyboardShortcuts() {
      return { "Mod-Enter": () => this.editor.commands.lift(name) };
    },
  });
}

export const PullQuote = editorialBlock({ name: "pullQuote", tag: "blockquote", attribute: "data-pull-quote", className: "writing-pull-quote" });
export const Marginalia = editorialBlock({ name: "marginalia", tag: "aside", attribute: "data-marginalia", className: "writing-marginalia" });
