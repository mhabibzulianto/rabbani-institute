"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { closeHistory } from "@tiptap/pm/history";
import chapters from "@/lib/quran-chapters.json";
import { quranSelection, validateQuranRange } from "@/lib/quran-selection.mjs";
import "./article-quran-picker.css";

const ArticleQuranPicker = forwardRef(function ArticleQuranPicker({ editor, disabled }, ref) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chapterId, setChapterId] = useState(1);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const [verses, setVerses] = useState([]);
  const [partial, setPartial] = useState(false);
  const [startWord, setStartWord] = useState(1);
  const [endWord, setEndWord] = useState(1);
  const [picking, setPicking] = useState("start");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const bookmarkRef = useRef(null);
  const controllerRef = useRef(null);
  const generationRef = useRef(0);
  const chapter = chapters.find(item => item.id === chapterId);
  const filtered = chapters.filter(item => (item.id + " " + item.name + " " + item.arabic).toLowerCase().includes(query.trim().toLowerCase()));
  let selection = null;
  try { if (verses.length) selection = quranSelection(chapter, verses, partial, startWord, endWord); } catch { /* Incomplete choices disable insertion. */ }
  useImperativeHandle(ref, () => ({ open: () => {
    if (!editor || disabled) return;
    bookmarkRef.current = editor.state.selection.getBookmark();
    setOpen(true); setError("");
  } }));
  useEffect(() => {
    if (!editor) return;
    const map = ({ transaction }) => { if (transaction.docChanged && bookmarkRef.current) bookmarkRef.current = bookmarkRef.current.map(transaction.mapping); };
    editor.on("transaction", map);
    return () => editor.off("transaction", map);
  }, [editor]);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { controllerRef.current?.abort(); if (dialog.open) dialog.close(); };
  }, [open]);
  function invalidate() {
    controllerRef.current?.abort(); generationRef.current++;
    setVerses([]); setError(""); setBusy(false); setPartial(false); setPicking("start");
  }
  function close() {
    controllerRef.current?.abort(); generationRef.current++; setBusy(false);
    dialogRef.current?.close(); setOpen(false);
    if (editor && !editor.isDestroyed && bookmarkRef.current) {
      const saved = bookmarkRef.current.resolve(editor.state.doc);
      editor.chain().focus().setTextSelection({ from: saved.from, to: saved.to }).run();
    }
    bookmarkRef.current = null;
  }
  async function load() {
    let range;
    try { range = validateQuranRange(chapter, from, to); }
    catch (err) { setError(err.message); return; }
    controllerRef.current?.abort(); const generation = ++generationRef.current;
    const controller = new AbortController(); controllerRef.current = controller;
    setBusy(true); setError(""); setVerses([]);
    try {
      const response = await fetch("/api/editorial/quran?" + new URLSearchParams({ chapter: String(chapterId), from: String(range.from), to: String(range.to) }), { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.verses?.length) throw new Error(data.error || "Ayat belum dapat dimuat.");
      if (generation !== generationRef.current) return;
      // Validate completeness before offering insertion.
      if (data.verses[0].number !== range.from || data.verses.at(-1).number !== range.to) throw new Error("Rentang ayat belum lengkap. Coba lagi.");
      quranSelection(chapter, data.verses);
      setVerses(data.verses); setStartWord(1); setEndWord(data.verses.at(-1).words.length); setPicking("start");
    } catch (err) { if (generation === generationRef.current && err.name !== "AbortError") setError(err.message || "Ayat belum dapat dimuat."); }
    finally { if (generation === generationRef.current) setBusy(false); }
  }
  function chooseWord(verse, word) {
    if (picking === "start") {
      setStartWord(word.position);
      if (verses.length === 1 && word.position > endWord) setEndWord(word.position);
      setPicking("end");
    } else {
      setEndWord(word.position);
      if (verses.length === 1 && word.position < startWord) setStartWord(word.position);
    }
  }
  function insert() {
    if (!editor || editor.isDestroyed || disabled || !selection || busy || !bookmarkRef.current) return;
    const saved = bookmarkRef.current.resolve(editor.state.doc);
    editor.view.dispatch(closeHistory(editor.state.tr));
    const inserted = editor.chain().focus().setTextSelection({ from: saved.from, to: saved.to }).insertContent(selection.content).run();
    if (!inserted) { setError("Ayat belum dapat disisipkan di posisi ini. Pilih paragraf biasa lalu coba lagi."); return; }
    editor.view.dispatch(closeHistory(editor.state.tr));
    bookmarkRef.current = null; dialogRef.current?.close(); setOpen(false); editor.commands.focus();
  }
  return open ? <dialog ref={dialogRef} className="writing-quran-dialog" aria-labelledby="quran-picker-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><div><h2 id="quran-picker-title">Sisipkan ayat</h2><p>Teks Arab tanpa terjemahan</p></div><button type="button" aria-label="Tutup pilihan ayat" onClick={close}>×</button></header>
    <div className="writing-quran-body">
      <label>Cari surat<input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Nama atau nomor surat…" /></label>
      <label>Surat<select aria-label="Surat" value={chapterId} onChange={event => { invalidate(); setChapterId(Number(event.target.value)); setFrom("1"); setTo("1"); }}>
        {!filtered.some(item => item.id === chapterId) && <option value={chapterId}>{chapter.id}. {chapter.name} — {chapter.verses} ayat</option>}
        {filtered.map(item => <option key={item.id} value={item.id}>{item.id}. {item.name} — {item.verses} ayat</option>)}
      </select></label>
      {!filtered.length && <p role="status">Surat tidak ditemukan.</p>}
      <div className="writing-quran-range"><label>Ayat awal<input type="number" min="1" max={chapter.verses} value={from} onChange={event => { invalidate(); setFrom(event.target.value); setTo(event.target.value); }} /></label><label>Ayat akhir<input type="number" min={Number(from) || 1} max={chapter.verses} value={to} onChange={event => { invalidate(); setTo(event.target.value); }} /></label><button type="button" className="secondary-button" disabled={busy} onClick={load}>{busy ? "Memuat…" : "Tampilkan ayat"}</button></div>
      <p className="writing-quran-hint">Isi nomor yang sama untuk satu ayat. Maksimal 20 ayat per penyisipan.</p>
      {busy && <p role="status" aria-live="polite">Memuat teks dan kata ayat…</p>}
      {error && <p className="writing-quran-error" role="alert">{error}</p>}
      {verses.length > 0 && <>
        <label className="writing-quran-check"><input type="checkbox" checked={partial} onChange={event => setPartial(event.target.checked)} />Ambil bagian ayat</label>
        {partial && <>
          <fieldset className="writing-quran-mode"><legend>Pilih batas kutipan</legend><label><input type="radio" name="quran-boundary" checked={picking === "start"} onChange={() => setPicking("start")} />Kata awal · {startWord}</label><label><input type="radio" name="quran-boundary" checked={picking === "end"} onChange={() => setPicking("end")} />Kata akhir · {endWord}</label></fieldset>
          <p className="writing-quran-hint">Klik kata {picking === "start" ? "awal pada ayat pertama" : "akhir pada ayat terakhir"}. Ayat di antaranya disertakan utuh.</p>
          <div className="writing-quran-words">{verses.map((verse, verseIndex) => <section key={verse.key}><h3>Ayat {verse.number}</h3><div dir="rtl" lang="ar">{verse.words.map(word => {
            const selected = (verseIndex > 0 || word.position >= startWord) && (verseIndex < verses.length - 1 || word.position <= endWord);
            const available = picking === "start" ? verseIndex === 0 : verseIndex === verses.length - 1;
            return <button type="button" key={word.position} aria-label={"Ayat " + verse.number + ", kata " + word.position + ": " + word.text} aria-pressed={selected} disabled={!available} className={selected ? "is-selected" : ""} onClick={() => chooseWord(verse, word)}>{word.text}</button>;
          })}</div></section>)}</div>
        </>}
        {selection && <section className="writing-quran-preview" aria-label="Preview kutipan ayat"><h3>Preview kutipan</h3><div dir="rtl" lang="ar">{selection.texts.map((text, index) => <p key={index}>{text}</p>)}</div><p className="writing-quran-reference">{selection.reference}</p></section>}
        <p className="writing-quran-hint">Sumber: <a href="https://quran.com" target="_blank" rel="noopener noreferrer">Quran.com</a> · Teks Utsmani. Setelah disisipkan, teks dan referensi dapat diedit langsung.</p>
      </>}
    </div>
    <footer><button type="button" className="secondary-button" onClick={close}>Batal</button><button type="button" className="writing-publish" disabled={!selection || busy || disabled} onClick={insert}>Sisipkan ayat</button></footer>
  </dialog> : null;
});
export default ArticleQuranPicker;
