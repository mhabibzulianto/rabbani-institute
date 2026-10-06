import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { mediaExtensions } from "./tiptap-media.mjs";

export function articleEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, link: { openOnClick: false, protocols: ["http", "https", "mailto"] } }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Placeholder.configure({ placeholder: "Mulai menulis cerita Anda…" }),
    CharacterCount,
    ...mediaExtensions(),
  ];
}
