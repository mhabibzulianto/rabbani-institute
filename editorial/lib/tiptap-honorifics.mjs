import { Extension, textInputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const HONORIFIC_GROUPS = [
  {
    label: "Allah",
    items: [
      { label: "‘Azza wa Jalla", text: "عز وجل", shortcut: ":azwj:" },
      { label: "Subhanahu wa Ta‘ala", text: "سبحانه وتعالى", shortcut: ":swt:" },
      { label: "Jalla Jalaluhu", text: "جل جلاله", shortcut: ":jj:" },
    ],
  },
  {
    label: "Nabi Muhammad",
    items: [
      { label: "Simbol ﷺ", text: "ﷺ", shortcut: ":saw:" },
      { label: "Shallallahu ‘Alaihi wa Sallam", text: "صلى الله عليه وسلم", shortcut: ":saws:" },
    ],
  },
  {
    label: "Nabi dan Rasul",
    items: [
      { label: "‘Alaihis Salam", text: "عليه السلام", shortcut: ":as:" },
      { label: "‘Alaihas Salam", text: "عليها السلام", shortcut: ":as-f:" },
      { label: "‘Alaihimas Salam", text: "عليهما السلام", shortcut: ":as-2:" },
      { label: "‘Alaihimus Salam", text: "عليهم السلام", shortcut: ":as-pl:" },
    ],
  },
  {
    label: "Sahabat",
    items: [
      { label: "Radhiyallahu ‘Anhu", text: "رضي الله عنه", shortcut: ":ra:" },
      { label: "Radhiyallahu ‘Anha", text: "رضي الله عنها", shortcut: ":ra-f:" },
      { label: "Radhiyallahu ‘Anhuma", text: "رضي الله عنهما", shortcut: ":ra-2:" },
      { label: "Radhiyallahu ‘Anhum", text: "رضي الله عنهم", shortcut: ":ra-pl:" },
      { label: "Radhiyallahu ‘Anhunna", text: "رضي الله عنهن", shortcut: ":ra-fpl:" },
    ],
  },
  {
    label: "Ulama",
    items: [
      { label: "Rahimahullah", text: "رحمه الله", shortcut: ":rh:" },
      { label: "Rahimahallah", text: "رحمها الله", shortcut: ":rh-f:" },
      { label: "Rahimahumallah", text: "رحمهما الله", shortcut: ":rh-2:" },
      { label: "Rahimahumullah", text: "رحمهم الله", shortcut: ":rh-pl:" },
      { label: "Hafizhahullah", text: "حفظه الله", shortcut: ":hfz:" },
      { label: "Hafizhahallah", text: "حفظها الله", shortcut: ":hfz-f:" },
      { label: "Hafizhahumullah", text: "حفظهم الله", shortcut: ":hfz-pl:" },
    ],
  },
];

export const HONORIFICS = HONORIFIC_GROUPS.flatMap((group) => group.items);

const SUGGESTION_RULES = [
  { find: /(?:^|[\s([{"'“‘])(?:rasulullah|nabi muhammad|muhammad rasulullah)$/iu, text: "ﷺ" },
  { find: /(?:^|[\s([{"'“‘])nabi\s+(?!muhammad(?:\s|$))[\p{L}’'\-]+$/iu, text: "عليه السلام" },
  { find: /(?:^|[\s([{"'“‘])(?:allah|الله)$/iu, text: "عز وجل" },
  { find: /(?:^|[\s([{"'“‘])(?:abu bakar|umar bin khattab|utsman bin affan|ali bin abi thalib)$/iu, text: "رضي الله عنه" },
  { find: /(?:^|[\s([{"'“‘])(?:aisyah|khadijah|fatimah)$/iu, text: "رضي الله عنها" },
];

export function findHonorificSuggestion(state) {
  const { $from, empty } = state.selection;
  if (!empty || !$from.parent.isTextblock) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, "", "\ufffc");
  const rule = SUGGESTION_RULES.find(({ find }) => find.test(before));
  return rule ? { text: rule.text, position: $from.pos } : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function honorificForShortcut(shortcut) {
  return HONORIFICS.find((item) => item.shortcut.toLowerCase() === String(shortcut).toLowerCase())?.text || null;
}

export const Honorifics = Extension.create({
  name: "honorifics",
  addInputRules() {
    return HONORIFICS.map((item) => textInputRule({
      find: new RegExp(`${escapeRegExp(item.shortcut)}$`, "i"),
      replaceWith: item.text,
    }));
  },
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [new Plugin({
      key: new PluginKey("honorificSuggestions"),
      props: {
        decorations(state) {
          if (!editor.isEditable) return null;
          const suggestion = findHonorificSuggestion(state);
          if (!suggestion) return null;
          return DecorationSet.create(state.doc, [Decoration.widget(suggestion.position, () => {
            const ghost = document.createElement("span");
            ghost.className = "writing-honorific-suggestion";
            ghost.setAttribute("aria-hidden", "true");
            ghost.textContent = ` ${suggestion.text}`;
            const hint = document.createElement("span");
            hint.textContent = "  Tab / Spasi";
            ghost.appendChild(hint);
            return ghost;
          }, { key: `honorific:${suggestion.position}:${suggestion.text}`, side: 1 })]);
        },
        handleKeyDown(view, event) {
          if (event.isComposing) return false;
          const suggestion = findHonorificSuggestion(view.state);
          if (!suggestion) return false;
          const acceptsWithSpace = event.key === " " && typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
          if (event.key !== "Tab" && !acceptsWithSpace) return false;
          event.preventDefault();
          view.dispatch(view.state.tr.insertText(` ${suggestion.text} `, suggestion.position).scrollIntoView());
          return true;
        },
      },
    })];
  },
});
