"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { editorFootnotes, newFootnoteId } from "@/lib/tiptap-footnotes.mjs";
import { closeHistory } from "@tiptap/pm/history";
import { FOOTNOTE_LIMIT, FOOTNOTE_TEXT_LIMIT, footnoteLinks } from "../../packages/article-footnotes/index.mjs";
import "./article-footnotes.css";

function NoteText({ text }) {
  return footnoteLinks(text).map((part, index) => part.href ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a> : part.text);
}
const ArticleFootnotes = forwardRef(function ArticleFootnotes({ editor, disabled }, ref) {
  const [notes, setNotes] = useState([]);
  const [session, setSession] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const bookmarkRef = useRef(null);
  const openerRef = useRef(null);

  function open(note, anchor) {
    if (!editor || disabled) return;
    if (!note && editorFootnotes(editor.state.doc).length >= FOOTNOTE_LIMIT) { setError("Maksimal 200 catatan kaki per artikel."); return; }
    const rect = anchor?.getBoundingClientRect() || editor.view.coordsAtPos(editor.state.selection.to);
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    const top = Math.max(12, Math.min(below, window.innerHeight - 340));
    openerRef.current = anchor || null;
    bookmarkRef.current = editor.state.selection.getBookmark();
    setText(note?.text || ""); setError("");
    setSession({ id: note?.id, number: note?.number, left, top, width });
  }
  useImperativeHandle(ref, () => ({ openNew: () => open() }));
  useEffect(() => {
    if (!editor) return;
    const update = ({ transaction } = {}) => {
      if (transaction?.docChanged && bookmarkRef.current) bookmarkRef.current = bookmarkRef.current.map(transaction.mapping);
      setNotes(editorFootnotes(editor.state.doc));
    };
    const activate = (event) => {
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      const marker = event.target.closest?.("[data-footnote-id]");
      if (!marker) return;
      const note = editorFootnotes(editor.state.doc).find(item => item.id === marker.dataset.footnoteId);
      if (note && !disabled) { event.preventDefault(); if (event.type === "keydown") event.stopPropagation(); open(note, marker); }
    };
    update(); editor.on("transaction", update);
    const dom = editor.view.dom;
    dom.addEventListener("click", activate); dom.addEventListener("keydown", activate, true);
    return () => { editor.off("transaction", update); dom.removeEventListener("click", activate); dom.removeEventListener("keydown", activate, true); };
  // The event handlers must observe the latest editing permissions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, disabled]);
  useEffect(() => {
    if (!session) return;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [session]);

  function close(position) {
    dialogRef.current?.close();
    setSession(null);
    if (openerRef.current?.isConnected && position == null) openerRef.current.focus();
    else if (editor && !editor.isDestroyed) {
      const restored = bookmarkRef.current?.resolve(editor.state.doc);
      editor.chain().focus().setTextSelection(position ?? { from: restored?.from || 1, to: restored?.to || 1 }).run();
    }
    bookmarkRef.current = null;
  }
  function apply(remove = false) {
    if (!editor || disabled) return;
    if (!remove && !text.trim()) { setError("Isi catatan kaki terlebih dahulu."); return; }
    const note = session.id && editorFootnotes(editor.state.doc).find(item => item.id === session.id);
    if (session.id && !note) { setError("Penanda sudah dihapus. Tutup lalu buat catatan baru."); return; }
    // Each note action is one undo step, separate from the surrounding typing.
    editor.view.dispatch(closeHistory(editor.state.tr));
    if (note) {
      if (remove) editor.chain().deleteRange({ from: note.pos, to: note.pos + 1 }).run();
      else editor.view.dispatch(editor.state.tr.setNodeMarkup(note.pos, undefined, { id: note.id, text: text.trim() }));
      close(remove ? note.pos : note.pos + 1);
    } else {
      const position = bookmarkRef.current.resolve(editor.state.doc).to;
      editor.chain().setTextSelection(position).insertContent({ type: "footnote", attrs: { id: newFootnoteId(), text: text.trim() } }).run();
      close(position + 1);
    }
    editor.view.dispatch(closeHistory(editor.state.tr));
  }
  return <>
    {error && !session && <p className="writing-notice" role="alert">{error}</p>}
    {notes.length > 0 && <section className="writing-footnotes" aria-label="Catatan kaki"><h2>Catatan kaki</h2><ol>{notes.map(note => <li key={note.id}><div><NoteText text={note.text} /></div><button type="button" disabled={disabled} aria-label={`Edit catatan kaki ${note.number}`} onClick={event => open(note, event.currentTarget)}>Edit</button></li>)}</ol></section>}
    {session && <dialog ref={dialogRef} className="writing-footnote-popover" style={{ left: session.left, top: session.top, width: session.width }} aria-labelledby="footnote-heading" onCancel={event => { event.preventDefault(); close(); }}><form onSubmit={event => { event.preventDefault(); apply(); }}>
      <header><h2 id="footnote-heading">{session.id ? `Catatan kaki ${session.number}` : "Tambah catatan kaki"}</h2><button type="button" aria-label="Tutup catatan kaki" onClick={() => close()}>×</button></header>
      <label>Isi catatan<textarea autoFocus required rows={5} maxLength={FOOTNOTE_TEXT_LIMIT} value={text} disabled={disabled} onChange={event => setText(event.target.value)} placeholder="Nama kitab, jilid, halaman, atau penjelasan…" /></label>
      <p>Teks biasa dan tautan https://. {text.length.toLocaleString("id-ID")}/{FOOTNOTE_TEXT_LIMIT.toLocaleString("id-ID")}</p>
      {error && <p role="alert">{error}</p>}
      <footer>{session.id && <button type="button" className="footnote-delete" disabled={disabled} onClick={() => apply(true)}>Hapus</button>}<button type="button" onClick={() => close()}>Batal</button><button type="submit" disabled={disabled} className="writing-publish">Simpan</button></footer>
    </form></dialog>}
  </>;
});
export default ArticleFootnotes;
