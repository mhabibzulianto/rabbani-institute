"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { isSafeLandingUrl } from "@/lib/landing-document.mjs";
import { normalizeLandingRichText } from "@/lib/landing-editor.mjs";

export default function LandingRichText({ value, onChange, label }) {
  const callback = useRef(onChange); callback.current = onChange;
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, blockquote: false, codeBlock: false, code: false, underline: false, horizontalRule: false, link: { openOnClick: false, autolink: false, linkOnPaste: false, isAllowedUri: isSafeLandingUrl } })],
    content: value,
    editorProps: { attributes: { role: "textbox", "aria-label": label, "aria-multiline": "true", class: "landing-rich-prose" } },
    onUpdate: ({ editor: instance }) => callback.current(normalizeLandingRichText(instance.getJSON())),
  });
  useEffect(() => {
    if (editor && JSON.stringify(normalizeLandingRichText(editor.getJSON())) !== JSON.stringify(value)) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  if (!editor) return <p>Memuat text editor…</p>;
  const tools = [
    ["Tebal", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold")],
    ["Miring", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic")],
    ["Coret", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike")],
    ["Daftar", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList")],
    ["Nomor", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList")],
  ];
  return <div className="landing-rich-editor">
    <div className="landing-rich-tools">{tools.map(([name, action, active]) => <button type="button" key={name} aria-pressed={active} onClick={action}>{name}</button>)}
      <select aria-label="Format teks" value={editor.isActive("heading") ? editor.getAttributes("heading").level : "paragraph"} onChange={(e) => e.target.value === "paragraph" ? editor.chain().focus().setParagraph().run() : editor.chain().focus().setHeading({ level: Number(e.target.value) }).run()}><option value="paragraph">Paragraf</option>{[2, 3, 4].map((level) => <option key={level} value={level}>Heading {level}</option>)}</select>
    </div>
    <EditorContent editor={editor} />
    <div className="landing-link-input"><input aria-label="URL tautan teks" placeholder="https://… atau /halaman" value={url} onChange={(e) => setUrl(e.target.value)} /><button type="button" onClick={() => {
      if (!url || !isSafeLandingUrl(url)) { setError("Gunakan URL https://, path lokal, atau anchor."); return; }
      if (editor.state.selection.empty) { setError("Pilih teks terlebih dahulu."); return; }
      editor.chain().focus().setLink({ href: url }).run(); setError("");
    }}>Tautkan</button><button type="button" onClick={() => editor.chain().focus().unsetLink().run()}>Lepas</button></div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
