"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { documentOutline, matchingSlashCommands } from "@/lib/editor-polish.mjs";

const bubbleOptions = { strategy: "fixed", placement: "top", offset: 10, shift: { padding:12 }, flip: { padding: { top:175, bottom:70, left:12, right:12 } } };

export default function EditorPolish({ editor, slash, slashControls, onMedia, onLink, disabled }) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(null);
  const [position, setPosition] = useState(null);
  const menuRef = useRef(null);
  const items = useMemo(() => matchingSlashCommands(slash?.query || ""), [slash?.query]);
  const doc = editor?.state.doc;
  const outline = useMemo(() => doc ? documentOutline(doc) : [], [doc]);
  const key = slash ? `${slash.from}:${slash.to}:${slash.query}` : null;
  const open = Boolean(editor && slash && !disabled && dismissed !== key);
  const showBubble = useCallback(({ editor: instance, state }) => !disabled && !state.selection.empty && instance.isEditable && (instance.view.hasFocus() || document.activeElement?.closest(".writing-bubble")) && Boolean(state.doc.textBetween(state.selection.from, state.selection.to).trim()) && !["image", "video", "audio", "document"].some((type) => instance.isActive(type)), [disabled]);
  const selected = Math.min(index, Math.max(0, items.length - 1));
  function run(item) {
    if (!item || !slash || disabled) return;
    const chain = editor.chain().focus().deleteRange({ from: slash.from, to: slash.to });
    if (item.id === "media") { chain.run(); onMedia(); }
    else chain[item.command](item.args).run();
  }
  useEffect(() => { setIndex(0); setDismissed(null); }, [key]);
  useEffect(() => {
    slashControls.current = (event) => {
      if (!open) return false;
      if (event.key === "Escape") { event.preventDefault(); setDismissed(key); return true; }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setIndex((value) => (value + (event.key === "ArrowDown" ? 1 : -1) + Math.max(1, items.length)) % Math.max(1, items.length)); return true; }
      if (event.key === "Enter" && items.length) { event.preventDefault(); run(items[selected]); return true; }
      return false;
    };
    return () => { slashControls.current = null; };
  });
  useEffect(() => {
    if (!open) { setPosition(null); return; }
    function place() {
      try {
        const rect = editor.view.coordsAtPos(slash.to);
        const width = Math.min(290, window.innerWidth - 24);
        const safeTop = (document.querySelector(".writing-toolbar")?.getBoundingClientRect().bottom || 130) + 8;
        const bottom = (window.visualViewport ? window.visualViewport.height + window.visualViewport.offsetTop : window.innerHeight) - 70;
        const maxHeight = Math.max(90, Math.min(320, bottom - safeTop));
        const height = Math.min(menuRef.current?.offsetHeight || 320, maxHeight);
        setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: Math.max(safeTop, Math.min(bottom - height, rect.bottom + height + 8 > bottom ? rect.top - height - 8 : rect.bottom + 8)), width, maxHeight });
      } catch { setPosition(null); }
    }
    place(); window.addEventListener("scroll", place, true); window.addEventListener("resize", place); window.visualViewport?.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); window.visualViewport?.removeEventListener("resize", place); };
  }, [editor, open, slash?.to, items.length]);
  useEffect(() => { menuRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [selected]);
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    if (open) {
      dom.setAttribute("aria-controls", "writing-slash-menu");
      if (items.length) dom.setAttribute("aria-activedescendant", `writing-command-${items[selected].id}`);
      else dom.removeAttribute("aria-activedescendant");
    } else { dom.removeAttribute("aria-controls"); dom.removeAttribute("aria-activedescendant"); }
    return () => { dom.removeAttribute("aria-controls"); dom.removeAttribute("aria-activedescendant"); };
  }, [editor, open, items, selected]);
  return <>
    <details className="writing-outline"><summary>Daftar isi <span>{outline.length} bagian</span></summary>
      <nav aria-label="Daftar isi artikel">{outline.length ? <ol>{outline.map((item) => <li key={item.position} style={{ paddingInlineStart: `${(item.level - 2) * 14}px` }}><button type="button" onClick={() => { editor.commands.focus(item.position + 1); editor.view.domAtPos(item.position + 1).node.parentElement?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}>{item.title}</button></li>)}</ol> : <p>Gunakan heading untuk menyusun bagian artikel.</p>}</nav>
    </details>
    {editor && <BubbleMenu editor={editor} pluginKey="editorialBubbleMenu" options={bubbleOptions} shouldShow={showBubble} style={{ zIndex:20 }}>
      <div className="writing-bubble" role="toolbar" aria-label="Format teks terpilih">
        {[["bold", "Tebal", "B", "toggleBold"], ["italic", "Miring", "I", "toggleItalic"], ["underline", "Garis bawah", "U", "toggleUnderline"]].map(([mark, label, text, command]) => <button key={mark} type="button" aria-label={label} title={label} aria-pressed={editor.isActive(mark)} onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus()[command]().run()}>{text}</button>)}
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onLink}>Tautan</button>
        <button type="button" aria-label="Hapus format teks" title="Hapus format teks" onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus().unsetAllMarks().run()}>Tx</button>
      </div>
    </BubbleMenu>}
    {open && <div ref={menuRef} className="writing-slash-menu" style={position || { visibility: "hidden" }} role="listbox" aria-label="Perintah blok" id="writing-slash-menu" aria-activedescendant={items.length ? `writing-command-${items[selected].id}` : undefined}>
      <p className="writing-slash-label">Sisipkan blok</p>
      {items.length ? items.map((item, itemIndex) => <button type="button" role="option" aria-selected={selected === itemIndex} id={`writing-command-${item.id}`} key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => run(item)}><strong>{item.label}</strong><span>{item.hint}</span></button>) : <p className="writing-slash-empty">Perintah tidak ditemukan. Esc untuk menutup.</p>}
      <span className="visually-hidden" role="status">{items.length} perintah tersedia. Gunakan panah atas atau bawah dan Enter.</span>
    </div>}
  </>;
}
