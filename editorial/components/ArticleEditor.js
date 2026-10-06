"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, FontBoldIcon, FontItalicIcon, UnderlineIcon, StrikethroughIcon, Link2Icon, ListBulletIcon, QuoteIcon, CodeIcon, DividerHorizontalIcon, TextAlignLeftIcon, TextAlignCenterIcon, TextAlignRightIcon, TextAlignJustifyIcon, ResetIcon, DownloadIcon, Cross2Icon, ImageIcon } from "@radix-ui/react-icons";
import { articleEditorExtensions } from "@/lib/tiptap-extensions.mjs";
import { safeEditorLink } from "@/lib/editor-links.mjs";
import { saveEditorialArticle, publishEditorialArticle } from "@/lib/editor-actions";
import { ARTICLE_STATUSES } from "@/lib/article-list.mjs";
import MediaPanel from "@/components/MediaPanel";
import { createEditorialCategory } from "@/lib/media-actions";
import ArticleWorkflow from "@/components/ArticleWorkflow";
import PublicationPreview from "@/components/PublicationPreview";
import { previewEditorialDraft } from "@/lib/workflow-actions";
import EditorPolish from "@/components/EditorPolish";
import { EditorPolish as PolishExtension } from "@/lib/editor-polish-extension.mjs";

function Tool({ label, icon: Icon, children, active, disabled, onClick }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active == null ? undefined : active} disabled={disabled} className={`writing-tool${active ? " is-active" : ""}`} onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{Icon ? <Icon aria-hidden="true" /> : children}</button>;
}

export default function ArticleEditor({ article, initialContent, unsupportedHtml, canEdit, schemaReady, admin, categories, userId }) {
  const router = useRouter();
  const [fields, setFields] = useState({ title: article.title, excerpt: article.excerpt, topic: article.topic, tags: article.tags, category: article.category, cover: article.cover || "" });
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [mediaSession, setMediaSession] = useState(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const mediaDialogRef = useRef(null);
  const categoryDialogRef = useRef(null);
  const previewDialogRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const previewRequest = useRef(0);
  const [revision, setRevision] = useState(0);
  const [saveState, setSaveState] = useState(schemaReady ? "saved" : "local");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(article.status);
  const [publishing, setPublishing] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState("");
  const [slash, setSlash] = useState(null);
  const [pasteNotice, setPasteNotice] = useState("");
  const slashControls = useRef(null);
  const [, updateToolbar] = useState(0);
  const latestRef = useRef({ ...fields, doc: initialContent });
  const savedRef = useRef("");
  const versionRef = useRef(article.version);
  const dirtyRef = useRef(false);
  const blockedRef = useRef(false);
  const savingRef = useRef(null);
  const saveFnRef = useRef(null);
  const titleRef = useRef(null);
  const linkDialogRef = useRef(null);
  const publishDialogRef = useRef(null);
  const mountedRef = useRef(true);
  const backupKey = `editorial-draft:${userId}:${article.id}`;
  const editable = canEdit && (admin || ["draft", "rejected"].includes(status));

  function changed() {
    dirtyRef.current = JSON.stringify(latestRef.current) !== savedRef.current;
    setSaveState(schemaReady ? dirtyRef.current ? "dirty" : "saved" : "local");
    setRevision((value) => value + 1);
    try {
      if (dirtyRef.current) localStorage.setItem(backupKey, JSON.stringify({ ...latestRef.current, baseVersion: versionRef.current, savedAt: new Date().toISOString() }));
      else localStorage.removeItem(backupKey);
    }
    catch { setError("Salinan lokal tidak dapat disimpan di browser ini. Unduh tulisan untuk menyimpan salinan."); }
  }

  const editor = useEditor({
    extensions: [...articleEditorExtensions(), PolishExtension.configure({ onSlash: setSlash, onSlashKey: (event) => slashControls.current?.(event) || false, onPasteNotice: setPasteNotice })], content: initialContent, immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editable: editable && !publishing,
    editorProps: { attributes: { class: "writing-prose", role: "textbox", "aria-label": "Isi artikel", "aria-multiline": "true", spellcheck: "true" } },
    onCreate: ({ editor: instance }) => {
      latestRef.current.doc = JSON.parse(JSON.stringify(instance.getJSON()));
      savedRef.current = JSON.stringify({ title: article.title, excerpt: article.excerpt, topic: article.topic, tags: article.tags, category: article.category, cover: article.cover || "", doc: instance.getJSON() });
    },
    onUpdate: ({ editor: instance }) => { latestRef.current.doc = JSON.parse(JSON.stringify(instance.getJSON())); changed(); },
    onTransaction: ({ transaction }) => { if (transaction.docChanged || transaction.selectionSet || transaction.storedMarksSet) updateToolbar((value) => value + 1); },
  });

  useEffect(() => { editor?.setEditable(editable && !publishing, false); }, [editor, editable, publishing]);
  useEffect(() => {
    function resizeTitle() {
      if (titleRef.current) { titleRef.current.style.height = "auto"; titleRef.current.style.height = `${titleRef.current.scrollHeight}px`; }
    }
    resizeTitle();
    let width = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width !== width) { width = entry.contentRect.width; resizeTitle(); }
    });
    if (titleRef.current) observer.observe(titleRef.current);
    window.addEventListener("resize", resizeTitle);
    return () => { observer.disconnect(); window.removeEventListener("resize", resizeTitle); };
  }, [fields.title]);
  useEffect(() => {
    mountedRef.current = true;
    try {
      const backup = JSON.parse(localStorage.getItem(backupKey) || "null");
      if (backup?.doc?.type === "doc" && typeof backup.title === "string" && (!article.last_saved_at || new Date(backup.savedAt) > new Date(article.last_saved_at))) setRecovery(backup);
    } catch { /* An invalid local backup must never replace server content. */ }
    return () => { mountedRef.current = false; };
  }, [backupKey, article.last_saved_at]);

  async function saveNow() {
    if (!editable || !schemaReady || blockedRef.current) return false;
    if (savingRef.current) { await savingRef.current; return saveNow(); }
    if (!dirtyRef.current) return true;
    // ProseMirror uses null-prototype attribute maps; server actions need plain JSON.
    const snapshot = JSON.parse(JSON.stringify(latestRef.current));
    setSaveState("saving");
    const operation = (async () => {
      let result;
      try { result = await saveEditorialArticle({ ...snapshot, id: article.id, version: versionRef.current }); }
      catch { result = { ok: false, code: "network", error: "Koneksi terputus. Tulisan belum tersimpan ke server; coba simpan lagi." }; }
      if (!result.ok) {
        if (["conflict", "locked", "schema", "access"].includes(result.code)) blockedRef.current = true;
        if (mountedRef.current) { setSaveState("error"); setError(result.error); }
        return false;
      }
      versionRef.current = result.version;
      savedRef.current = JSON.stringify(snapshot);
      dirtyRef.current = JSON.stringify(latestRef.current) !== savedRef.current;
      if (mountedRef.current) { setSaveState(dirtyRef.current ? "dirty" : "saved"); setError(""); }
      if (!dirtyRef.current) { try { localStorage.removeItem(backupKey); } catch { /* Server copy has been saved. */ } }
      return true;
    })();
    savingRef.current = operation;
    const ok = await operation;
    savingRef.current = null;
    return ok;
  }
  saveFnRef.current = saveNow;
  useEffect(() => {
    if (!revision || !schemaReady || !editable) return;
    const timer = setTimeout(() => { saveFnRef.current(); }, 1200);
    return () => clearTimeout(timer);
  }, [revision, schemaReady, editable]);
  useEffect(() => {
    function beforeUnload(event) { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } }
    function keydown(event) { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveFnRef.current(); } }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("keydown", keydown);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("keydown", keydown); };
  }, []);

  function fieldChanged(name, value) {
    setFields((current) => ({ ...current, [name]: value }));
    latestRef.current = { ...latestRef.current, [name]: value };
    changed();
  }
  function openLink() {
    setLinkValue(editor.getAttributes("link").href || ""); setLinkError("");
    linkDialogRef.current.showModal(); linkDialogRef.current.querySelector("input").focus();
  }
  function openMedia(target = "body") {
    const type = ["image", "video", "audio", "document"].find((kind) => editor?.isActive(kind));
    const attrs = type ? editor.getAttributes(type) : null;
    setMediaSession({ target, from: editor?.state.selection.from, to: editor?.state.selection.to, initialAsset: target === "body" && attrs ? { ...attrs, kind: type, url: attrs.src } : null });
    mediaDialogRef.current.showModal();
  }
  function chooseMedia(asset) {
    if (mediaSession.target === "cover") fieldChanged("cover", asset.url);
    else editor.chain().focus().insertContentAt({ from: mediaSession.from, to: mediaSession.to }, { type: asset.kind, attrs: { src: asset.url, alt: asset.alt || "", caption: asset.caption || "", filename: asset.name || asset.filename || "" } }).run();
    mediaDialogRef.current.close(); setMediaSession(null);
  }
  async function addCategory(event) {
    event.preventDefault(); setCategoryBusy(true); setCategoryError("");
    try {
      const result = await createEditorialCategory(categoryTitle);
      if (!result.ok || !result.category?.id) { setCategoryError(result.error || "Kategori belum dapat ditambahkan."); return; }
      setCategoryOptions((options) => options.some((item) => String(item.id) === String(result.category.id)) ? options : [...options, result.category].sort((a, b) => a.title_id.localeCompare(b.title_id, "id")));
      fieldChanged("category", String(result.category.id)); categoryDialogRef.current.close();
    } catch { setCategoryError("Koneksi terputus. Coba lagi."); }
    finally { setCategoryBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ title: fields.title, ...latestRef.current, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `artikel-${article.id}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function openPreview() {
    if (unsupportedHtml != null) { router.push(`/artikel/${article.id}/preview`); return; }
    const request = ++previewRequest.current;
    setPreview(null); previewDialogRef.current.showModal();
    try {
      const result = await previewEditorialDraft(JSON.parse(JSON.stringify(latestRef.current)));
      if (request === previewRequest.current) setPreview(result.ok ? result.preview : { error: result.error });
    } catch { if (request === previewRequest.current) setPreview({ error: "Preview belum dapat dimuat. Periksa koneksi lalu coba lagi." }); }
  }
  async function leave(event) {
    if (!dirtyRef.current || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const saved = await saveFnRef.current();
    if (saved) { dirtyRef.current = false; router.push("/artikel"); }
    else if (window.confirm("Tulisan belum tersimpan ke server. Salinan lokal tetap tersedia. Kembali ke daftar artikel?")) { dirtyRef.current = false; router.push("/artikel"); }
  }
  async function publish() {
    setPublishing(true);
    const saved = await prepareWorkflow();
    if (!saved || dirtyRef.current) { setPublishing(false); return; }
    let result;
    try { result = await publishEditorialArticle({ id: article.id, version: versionRef.current }); }
    catch { result = { ok: false, error: "Proses belum selesai. Periksa koneksi lalu muat ulang untuk memeriksa status artikel." }; blockedRef.current = true; }
    if (result.version) versionRef.current = result.version;
    if (result.status) setStatus(result.status);
    if (result.ok) { setSaveState("saved"); setError(""); publishDialogRef.current.close(); router.refresh(); }
    else { setError(result.error); if (result.code === "conflict") blockedRef.current = true; }
    setPublishing(false);
  }
  async function prepareWorkflow() {
    if (savingRef.current) await savingRef.current;
    const saved = !dirtyRef.current || await saveFnRef.current();
    return saved && !dirtyRef.current;
  }
  const currentDocument = editor?.state.doc;
  const { words, characters } = useMemo(() => currentDocument ? { words: editor.storage.characterCount.words(), characters: editor.storage.characterCount.characters() } : { words:0, characters:0 }, [editor, currentDocument]);
  const canPublish = schemaReady && article.workflowReady && !unsupportedHtml && !publishing && (admin ? ["draft", "rejected", "submitted"] : ["draft", "rejected"]).includes(status) && words > 0 && fields.title.trim();
  const disabled = !editor || !editable || publishing;
  const saveLabel = { saved: "Tersimpan", dirty: "Perubahan belum tersimpan", saving: "Menyimpan…", error: "Belum tersimpan", local: "Pratinjau lokal" }[saveState];

  return <div className="writing-workspace">
    <header className="writing-header">
      <Link href="/artikel" onClick={leave} className="writing-back"><ArrowLeftIcon aria-hidden="true" /><span>Dashboard</span></Link>
      <div className="writing-brand"><span className="writing-brand-mark">R</span><span>Rabbani<span className="writing-brand-sub"> Editorial</span></span></div>
      <div className="writing-header-actions"><button type="button" className="writing-preview-button" disabled={!editor} onClick={openPreview}>Preview</button><button type="button" className="writing-publish" disabled={!canPublish} onClick={() => publishDialogRef.current.showModal()}>{status === "published" ? "Published" : publishing ? "Memproses…" : "Publish"}</button></div>
    </header>
    <div className="writing-toolbar">
      <div className="writing-toolbar-tools" role="toolbar" aria-label="Pemformatan artikel" onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || event.target.tagName === "SELECT") return;
        const tools = Array.from(event.currentTarget.querySelectorAll("button:not(:disabled), select:not(:disabled)"));
        const index = tools.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        tools[event.key === "Home" ? 0 : event.key === "End" ? tools.length-1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tools.length) % tools.length]?.focus();
      }}>
        <select aria-label="Jenis blok teks" disabled={disabled} value={editor?.isActive("heading") ? `h${editor.getAttributes("heading").level}` : "p"} onChange={(event) => { const value = event.target.value; if (value === "p") editor.chain().focus().setParagraph().run(); else editor.chain().focus().setHeading({ level: Number(value.slice(1)) }).run(); }}><option value="p">Teks biasa</option><option value="h2">Heading 1</option><option value="h3">Heading 2</option><option value="h4">Heading 3</option></select>
        <span className="writing-tool-divider" />
        {[["bold", "Tebal", FontBoldIcon, "toggleBold"], ["italic", "Miring", FontItalicIcon, "toggleItalic"], ["underline", "Garis bawah", UnderlineIcon, "toggleUnderline"], ["strike", "Coret", StrikethroughIcon, "toggleStrike"], ["code", "Kode inline", CodeIcon, "toggleCode"]].map(([mark, label, icon, command]) => <Tool key={mark} label={label} icon={icon} active={editor?.isActive(mark) || false} disabled={disabled} onClick={() => editor.chain().focus()[command]().run()} />)}
        <Tool label="Tautan" icon={Link2Icon} active={editor?.isActive("link") || false} disabled={disabled} onClick={openLink} />
        <Tool label="Sisipkan atau edit media" icon={ImageIcon} disabled={disabled} onClick={() => openMedia()} />
        <span className="writing-tool-divider" />
        <Tool label="Daftar bullet" icon={ListBulletIcon} active={editor?.isActive("bulletList") || false} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <Tool label="Daftar bernomor" active={editor?.isActive("orderedList") || false} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</Tool>
        <Tool label="Kutipan" icon={QuoteIcon} active={editor?.isActive("blockquote") || false} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <Tool label="Garis pemisah" icon={DividerHorizontalIcon} disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <span className="writing-tool-divider" />
        {[["left", "Rata kiri", TextAlignLeftIcon], ["center", "Rata tengah", TextAlignCenterIcon], ["right", "Rata kanan", TextAlignRightIcon], ["justify", "Rata kiri kanan", TextAlignJustifyIcon]].map(([align, label, icon]) => <Tool key={align} label={label} icon={icon} disabled={disabled} active={editor?.isActive({ textAlign: align }) || false} onClick={() => editor.chain().focus().setTextAlign(align).run()} />)}
        <span className="writing-tool-divider" />
        <Tool label="Undo" icon={ResetIcon} disabled={disabled || !editor?.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
        <Tool label="Redo" disabled={disabled || !editor?.can().redo()} onClick={() => editor.chain().focus().redo().run()}><ResetIcon className="writing-redo" aria-hidden="true" /></Tool>
      </div>
      <div className="writing-save-actions"><span role="status" aria-live="polite">{saveLabel}</span><button type="button" className="writing-save-button" disabled={!editable || !schemaReady || publishing || saveState === "saving"} onClick={() => saveNow()}>Simpan</button><Tool label="Unduh salinan tulisan" icon={DownloadIcon} onClick={download} /></div>
    </div>
    <div className="writing-canvas">
      {pasteNotice && <p className="writing-notice" role="status">{pasteNotice} <button type="button" onClick={() => setPasteNotice("")}>Tutup</button></p>}
      {!unsupportedHtml && <EditorPolish editor={editor} slash={slash} slashControls={slashControls} onMedia={openMedia} onLink={openLink} disabled={disabled} />}
      {!schemaReady && <p className="writing-notice">Penyimpanan ke server belum tersedia. Anda bisa mencoba editor dan mengunduh salinan tulisan.</p>}
      {!canEdit && !unsupportedHtml && <p className="writing-notice">Artikel ini hanya dapat dibaca karena statusnya {ARTICLE_STATUSES[status]?.toLowerCase() || status}.</p>}
      {error && <p className="writing-notice writing-notice-error" role="alert">{error} <button type="button" onClick={download}>Unduh salinan</button></p>}
      {recovery && editable && <div className="writing-notice">Ada salinan tulisan dari sesi sebelumnya. <button type="button" onClick={() => { for (const name of ["title", "excerpt", "topic", "tags", "category", "cover"]) if (typeof recovery[name] === "string") fieldChanged(name, recovery[name]); editor.commands.setContent(recovery.doc, { emitUpdate: true }); setRecovery(null); }}>Pulihkan salinan</button><button type="button" onClick={() => { setRecovery(null); localStorage.removeItem(backupKey); }}>Abaikan</button></div>}
      <div className="writing-document-label"><span>ARTIKEL</span><span>{ARTICLE_STATUSES[status] || status}</span></div>
      <div className="writing-cover">{fields.cover && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fields.cover} alt="" />
      </>}{editable && <div><button type="button" disabled={disabled} onClick={() => openMedia("cover")}>{fields.cover ? "Ganti cover" : "+ Tambahkan cover"}</button>{fields.cover && <button type="button" disabled={disabled} onClick={() => fieldChanged("cover", "")}>Hapus cover</button>}</div>}</div>
      <textarea ref={titleRef} rows={1} className="writing-title" aria-label="Judul artikel" placeholder="Tanpa judul" maxLength={200} value={fields.title} disabled={!editable || publishing} onChange={(event) => fieldChanged("title", event.target.value)} />
      <textarea className="writing-excerpt" aria-label="Ringkasan artikel" placeholder="Tambahkan ringkasan singkat…" rows={2} maxLength={500} value={fields.excerpt} disabled={!editable || publishing} onChange={(event) => fieldChanged("excerpt", event.target.value)} />
      <details className="writing-properties"><summary>Informasi artikel</summary><div>
        <label>Kategori<select value={fields.category} disabled={!editable || publishing} onChange={(event) => { if (event.target.value === "__new") { setCategoryTitle(""); setCategoryError(""); categoryDialogRef.current.showModal(); } else fieldChanged("category", event.target.value); }}><option value="">Belum dikategorikan</option>{categoryOptions.map((category) => <option key={category.id} value={String(category.id)}>{category.title_id}</option>)}<option value="__new">＋ Tambah kategori baru…</option></select></label>
        <label>Topik<input value={fields.topic} maxLength={200} disabled={!editable || publishing} onChange={(event) => fieldChanged("topic", event.target.value)} /></label>
        <label>Tag<input value={fields.tags} maxLength={1000} placeholder="Pisahkan dengan koma" disabled={!editable || publishing} onChange={(event) => fieldChanged("tags", event.target.value)} /></label>
      </div></details>
      <ArticleWorkflow article={article} admin={admin} status={status} ready={schemaReady && article.workflowReady} schedulerReady={article.schedulerReady} getVersion={() => versionRef.current} beforeAction={prepareWorkflow} onBusyChange={setPublishing} onChanged={(result) => { versionRef.current = result.version; setStatus(result.status); updateToolbar((value) => value+1); router.refresh(); }} />
      {unsupportedHtml != null ? <><p className="writing-notice">Artikel ini memakai blok khusus yang belum didukung editor MVP. Isi ditampilkan sebagai preview agar format aslinya tetap utuh.</p><div className="writing-prose" dangerouslySetInnerHTML={{ __html: unsupportedHtml }} /></> : editor ? <EditorContent editor={editor} /> : <p className="writing-editor-loading" role="status">Menyiapkan editor…</p>}
      <p className="writing-hint">Ketik <kbd>/</kbd> di awal paragraf untuk memilih blok. <kbd>Ctrl/Cmd+S</kbd> untuk menyimpan. Gunakan <kbd>**teks**</kbd> untuk tebal, <kbd>##</kbd> untuk heading, atau <kbd>-</kbd> untuk daftar.</p>
    </div>
    <footer className="writing-footer"><span>{words.toLocaleString("id-ID")} kata<span className="writing-footer-dot">·</span>{characters.toLocaleString("id-ID")} karakter<span className="writing-footer-dot">·</span>{Math.max(1, Math.ceil(words / 200))} menit baca</span><span>{saveLabel}</span></footer>
    <dialog ref={previewDialogRef} className="publication-live-dialog" aria-labelledby="publication-live-title" onClose={() => { previewRequest.current++; }}><div className="publication-preview-nav"><span id="publication-live-title">Preview publik · tulisan saat ini</span><button type="button" className="writing-save-button" onClick={() => previewDialogRef.current.close()}>← Kembali menulis</button></div>{preview?.error ? <p className="publication-empty" role="alert">{preview.error}</p> : preview ? <PublicationPreview preview={preview} author={article.author} category={categoryOptions.find((item) => String(item.id) === fields.category)?.title_id} /> : <p className="publication-empty" role="status">Menyiapkan preview…</p>}</dialog>
    <dialog ref={mediaDialogRef} className="writing-dialog media-dialog" aria-labelledby="writing-media-title" onCancel={(event) => { if (mediaBusy) event.preventDefault(); else setMediaSession(null); }}>
      <div className="writing-dialog-heading"><h2 id="writing-media-title">{mediaSession?.target === "cover" ? "Pilih cover artikel" : "Media artikel"}</h2><button type="button" aria-label="Tutup media" disabled={mediaBusy} onClick={() => { mediaDialogRef.current.close(); setMediaSession(null); }}><Cross2Icon /></button></div>
      {mediaSession && <MediaPanel key={`${mediaSession.target}:${mediaSession.from}`} imagesOnly={mediaSession.target === "cover"} initialAsset={mediaSession.initialAsset} onChoose={chooseMedia} onBusyChange={setMediaBusy} />}
    </dialog>
    <dialog ref={categoryDialogRef} className="writing-dialog" aria-labelledby="writing-category-title" onCancel={(event) => { if (categoryBusy) event.preventDefault(); }}><form onSubmit={addCategory}>
      <div className="writing-dialog-heading"><h2 id="writing-category-title">Tambah kategori baru</h2><button type="button" aria-label="Tutup kategori" disabled={categoryBusy} onClick={() => categoryDialogRef.current.close()}><Cross2Icon /></button></div>
      <label>Nama kategori<input required minLength={2} maxLength={120} value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} disabled={categoryBusy} autoFocus /></label>
      <p>Kategori dapat digunakan oleh seluruh penulis.</p>{categoryError && <p role="alert">{categoryError}</p>}<button type="submit" className="writing-publish" disabled={categoryBusy}>{categoryBusy ? "Menambahkan…" : "Tambah kategori"}</button>
    </form></dialog>
    <dialog ref={linkDialogRef} className="writing-dialog" aria-labelledby="writing-link-title">
      <form onSubmit={(event) => { event.preventDefault(); if (linkValue && !safeEditorLink(linkValue.trim())) { setLinkError("Gunakan URL lengkap https://, http://, atau mailto:."); return; } if (linkValue.trim()) editor.chain().focus().extendMarkRange("link").setLink({ href: linkValue.trim() }).run(); else editor.chain().focus().extendMarkRange("link").unsetLink().run(); linkDialogRef.current.close(); }}>
        <div className="writing-dialog-heading"><h2 id="writing-link-title">Tambahkan tautan</h2><button type="button" aria-label="Tutup tautan" onClick={() => linkDialogRef.current.close()}><Cross2Icon /></button></div>
        <label>URL<input type="text" value={linkValue} onChange={(event) => setLinkValue(event.target.value)} placeholder="https://" autoFocus /></label>
        <p>Kosongkan URL untuk menghapus tautan yang dipilih.</p>{linkError && <p role="alert">{linkError}</p>}
        <button className="writing-publish" type="submit">Terapkan</button>
      </form>
    </dialog>
    <dialog ref={publishDialogRef} className="writing-dialog" aria-labelledby="writing-publish-title">
      <div className="writing-dialog-heading"><h2 id="writing-publish-title">{admin ? "Terbitkan artikel" : "Ajukan untuk review"}</h2><button type="button" aria-label="Tutup publish" disabled={publishing} onClick={() => publishDialogRef.current.close()}><Cross2Icon /></button></div>
      <p>{admin ? "Perubahan terakhir disimpan sebelum artikel diterbitkan dan dapat dibaca publik." : "Perubahan terakhir disimpan lalu artikel dikirim ke tim redaksi. Tulisan terkunci selama proses review."}</p>
      <strong>{fields.title}</strong>
      {error && <p role="alert">{error}</p>}
      <div className="writing-dialog-actions"><button type="button" disabled={publishing} onClick={() => publishDialogRef.current.close()}>Batal</button><button type="button" className="writing-publish" disabled={publishing} onClick={publish}>{publishing ? "Memproses…" : admin ? "Terbitkan sekarang" : "Ajukan artikel"}</button></div>
    </dialog>
  </div>;
}
