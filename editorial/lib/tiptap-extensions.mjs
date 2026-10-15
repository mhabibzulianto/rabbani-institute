import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { mediaExtensions } from "./tiptap-media.mjs";
import { Footnote } from "./tiptap-footnotes.mjs";
import { Youtube } from "./tiptap-youtube.mjs";

import { ArabicBlock, QuranBlock } from "./tiptap-arabic.mjs";
import { Honorifics } from "./tiptap-honorifics.mjs";
import { Marginalia, PullQuote } from "./tiptap-editorial-blocks.mjs";

export function articleEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, link: { openOnClick: false, protocols: ["http", "https", "mailto"] } }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({ placeholder: "Mulai menulis cerita Anda…" }),
    CharacterCount,
    Footnote,
    Youtube,
    ArabicBlock,
    QuranBlock,
    Honorifics,
    PullQuote,
    Marginalia,
    ...mediaExtensions(),
  ];
}
