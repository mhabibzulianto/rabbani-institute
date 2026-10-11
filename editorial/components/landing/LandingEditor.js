"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowDown, ArrowUp, Copy, Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import LandingFields from "./LandingFields";
import LandingCanvas from "./LandingCanvas";
import LandingDialog from "./LandingDialog";
import { landingSchema, validateLandingDocument } from "@/lib/landing-document.mjs";
import { BLOCK_LABELS, createLandingBlock, moveLandingBlock, createLandingSaveQueue } from "@/lib/landing-editor.mjs";
import { saveLandingDraft } from "@/lib/landing-actions";
import { createLandingPreview } from "@/lib/landing-preview-actions";
import { prepareLandingPublication, publishLandingDraft } from "@/lib/landing-publication-actions";
import LandingPublicationStatus from "./LandingPublicationStatus";
import "./landing-editor.css";

const stateLabels = { saved: "Semua perubahan tersimpan", dirty: "Perubahan belum tersimpan", saving: "Menyimpan…", error: "Gagal menyimpan", conflict: "Konflik versi" };
const uid = () => `block-${crypto.randomUUID()}`;
function download(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const a = window.document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function LandingEditor({ initial, userId, saveAction = saveLandingDraft }) {
  const router = useRouter();
  const [document, setDocument] = useState(initial.document);
  const [selected, setSelected] = useState(initial.document.blocks[0]?.id);
  const [status, setStatus] = useState({ state: "saved", version: initial.version, dirty: false, error: "", conflict: false });
  const [viewport, setViewport] = useState("desktop");
  const [panel, setPanel] = useState("blocks");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const [notice, setNotice] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishReview, setPublishReview] = useState(null);
  const [publishNote, setPublishNote] = useState("");
  const [published, setPublished] = useState(initial.published);
  const [leaving, setLeaving] = useState(false);
  const [editTick, setEditTick] = useState(0);
  const initialized = useRef(false);
  const mounted = useRef(true);
  const recoveryPending = useRef(false);
  const queueRef = useRef(null);
  const dragRef = useRef(null);
  const inspectorHeading = useRef(null);
  const focusInspector = useRef(false);
  const backupKey = `landing-draft:${userId}:home`;
  const backup = useCallback(() => {
    const queue = queueRef.current;
    if (!initialized.current || recoveryPending.current) return;
    try {
      if (queue.dirty) localStorage.setItem(backupKey, JSON.stringify({ document: queue.document, baseVersion: queue.version, savedAt: new Date().toISOString() }));
      else localStorage.removeItem(backupKey);
    } catch { if (mounted.current) setNotice("Salinan lokal gagal disimpan. Unduh JSON sebagai cadangan."); }
  }, [backupKey]);
  if (!queueRef.current) queueRef.current = createLandingSaveQueue({ document: initial.document, version: initial.version, save: saveAction, onChange: (next) => {
    if (mounted.current) setStatus(next); backup();
  } });
  const queue = queueRef.current;
  const current = document.blocks.find((block) => block.id === selected);
  const currentIndex = document.blocks.findIndex((block) => block.id === selected);

  useEffect(() => {
    if (!focusInspector.current || adding || deleting) return;
    focusInspector.current = false;
    const frame = requestAnimationFrame(() => inspectorHeading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [selected, panel, adding, deleting]);

  useEffect(() => {
    mounted.current = true;
    if (!initialized.current) {
      initialized.current = true;
      try {
        const raw = localStorage.getItem(backupKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (JSON.stringify(saved.document) !== JSON.stringify(initial.document)) {
            recoveryPending.current = true; setRecovery(saved);
          } else localStorage.removeItem(backupKey);
        }
      } catch { setNotice("Salinan lokal tidak dapat dibaca. Draft server tetap digunakan."); }
    }
    const unload = (event) => { if (queue.dirty || recoveryPending.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload);
    return () => { mounted.current = false; window.removeEventListener("beforeunload", unload); };
  }, [backupKey, initial.document, queue]);
  useEffect(() => {
    if (!editTick || !initial.schemaReady || recoveryPending.current || status.conflict) return;
    const timer = setTimeout(() => { void queue.flush(); }, 1200);
    return () => clearTimeout(timer);
  }, [editTick, initial.schemaReady, queue, status.conflict]);

  function commit(next) {
    if (publishing) return;
    setDocument(next); queue.update(next); backup(); setEditTick((tick) => tick + 1);
  }
  function select(id) { focusInspector.current = true; setSelected(id); setPanel("settings"); }
  function updateProps(props) { commit({ ...document, blocks: document.blocks.map((block) => block.id === selected ? { ...block, props } : block) }); }
  function add(type) {
    if (document.blocks.length >= 40) return;
    const block = createLandingBlock(type, uid());
    commit({ ...document, blocks: [...document.blocks, block] }); select(block.id); setAdding(false);
    requestAnimationFrame(() => window.document.getElementById(`landing-block-${block.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
  function duplicate() {
    if (!current || document.blocks.length >= 40) return;
    const copy = { ...structuredClone(current), id: uid() };
    const blocks = [...document.blocks]; blocks.splice(currentIndex + 1, 0, copy);
    commit({ ...document, blocks }); select(copy.id);
  }
  async function exit() {
    if (recoveryPending.current) { setLeaving(true); return; }
    if (!queue.dirty || initial.schemaReady && await queue.flush()) router.push("/halaman-utama");
    else setLeaving(true);
  }
  async function openPreview() {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setPreviewing(true); setNotice("");
    try {
      const result = await createLandingPreview(queue.document);
      if (!result.ok) { tab?.close(); setNotice(result.error); return; }
      if (tab) tab.location.href = result.url;
      else window.location.assign(result.url);
    } catch { tab?.close(); setNotice("Preview gagal dibuka. Periksa koneksi dan coba lagi."); }
    finally { setPreviewing(false); }
  }
  function restoreBackup() {
    try {
      if (recovery.baseVersion !== initial.version) throw new Error("Versi server sudah berubah. Unduh salinan lokal lalu bandingkan dengan draft server; salinan tidak akan menimpa versi terbaru.");
      const restored = validateLandingDocument(recovery.document);
      recoveryPending.current = false; setRecovery(null); commit(restored);
    } catch (error) { setNotice(error.message); }
  }
  async function reviewPublish() {
    setPublishing(true); setNotice("");
    try {
      if (!await queue.flush() || queue.dirty) { setNotice("Simpan semua perubahan sebelum terbit."); return; }
      const review = await prepareLandingPublication(queue.version);
      if (!review.ok) { setNotice(review.error); return; }
      setPublishNote(""); setPublishReview(review);
    } catch { setNotice("Ringkasan publikasi gagal dimuat. Coba lagi."); }
    finally { setPublishing(false); }
  }
  async function publish() {
    setPublishing(true); setNotice("");
    try {
      const result = await publishLandingDraft({ version: publishReview.version, note: publishNote });
      if (!result.ok) { setNotice(result.error); setPublishReview(null); return; }
      setPublished({ revision: result.revision, publishedAt: result.publishedAt, synced: result.synced, syncError: result.syncError });
      setPublishReview(null); setNotice(result.synced ? "Landing berhasil diterbitkan dan disinkronkan." : "Landing berhasil diterbitkan. Sinkronisasi tertunda; coba lagi di status publikasi.");
    } catch { setPublishReview(null); setNotice("Hasil publikasi belum terkonfirmasi. Periksa riwayat sebelum mencoba lagi."); }
    finally { setPublishing(false); }
  }
  return <main className="landing-editor">
    <header className="landing-editor-header"><button type="button" aria-label="Kembali ke dashboard" className="landing-back" disabled={publishing} onClick={exit}><ArrowLeft size={17} /><span>Dashboard</span></button><div><strong>Halaman utama</strong><small>Rabbani Institute · draft</small></div><div className="landing-save-actions"><button type="button" className="landing-primary" disabled={publishing || !initial.publicationReady || status.conflict || Boolean(recovery)} onClick={reviewPublish}>{publishing ? "Memproses…" : "Terbitkan"}</button><button type="button" disabled={publishing || previewing || Boolean(recovery)} onClick={openPreview}>{previewing ? "Menyiapkan preview…" : "Preview situs"}</button><span role="status">{initial.schemaReady ? stateLabels[status.state] : "Mode draft lokal"}</span><button type="button" className="landing-primary" disabled={publishing || !initial.schemaReady || status.state === "saving" || status.conflict || Boolean(recovery)} onClick={() => queue.flush()}>{status.state === "error" ? "Coba simpan lagi" : "Simpan draft"}</button></div></header>
    {(!initial.schemaReady || status.error || notice || recovery || leaving) && <div className="landing-editor-notice" role="status">
      {!initial.schemaReady && <p>Penyimpanan belum tersedia. Jalankan landing_page_editor_patch.sql; perubahan dapat diunduh sebagai JSON.</p>}
      {status.error && <p>{status.error}</p>}{notice && <p>{notice}</p>}
      {recovery && <div><p>Salinan lokal belum tersimpan ditemukan. {recovery.baseVersion !== initial.version && "Versinya berbeda dari draft server."}</p><button type="button" disabled={recovery.baseVersion !== initial.version} onClick={restoreBackup}>Pulihkan salinan lokal</button><button type="button" onClick={() => download(recovery, "landing-backup.json")}>Unduh salinan lokal</button><button type="button" onClick={() => { localStorage.removeItem(backupKey); recoveryPending.current = false; setRecovery(null); }}>Gunakan draft server</button></div>}
      {status.conflict && <p>Unduh draft Anda sebelum memuat versi server terbaru. <button type="button" onClick={() => download({ document, baseVersion: queue.version }, "landing-conflict.json")}>Unduh draft saya</button> <button type="button" onClick={() => { backup(); window.location.reload(); }}>Muat versi server</button></p>}
      {leaving && <div><p>Draft belum tersimpan. Simpan atau unduh salinan sebelum kembali.</p><button type="button" onClick={() => download({ document, baseVersion: queue.version }, "landing-draft.json")}>Unduh draft</button><button type="button" onClick={() => router.push("/halaman-utama")}>Kembali dengan salinan lokal</button><button type="button" onClick={() => setLeaving(false)}>Tetap mengedit</button></div>}
    </div>}
    <nav className="landing-editor-tools" aria-label="Tampilan editor" inert={publishing ? "" : undefined}><div><button type="button" onClick={() => setPanel("blocks")} aria-controls="landing-panel-blocks" aria-pressed={panel === "blocks"}>Daftar blok</button><button type="button" onClick={() => setPanel("canvas")} aria-controls="landing-panel-canvas" aria-pressed={panel === "canvas"}>Kanvas</button><button type="button" onClick={() => setPanel("settings")} aria-controls="landing-panel-settings" aria-pressed={panel === "settings"}>Pengaturan</button></div><div><button type="button" onClick={() => setViewport("desktop")} aria-pressed={viewport === "desktop"}>Desktop</button><button type="button" onClick={() => setViewport("mobile")} aria-pressed={viewport === "mobile"}>Mobile</button><button type="button" disabled={Boolean(recovery)} onClick={() => download({ document, baseVersion: queue.version }, "landing-draft.json")}>Unduh JSON</button></div></nav>
    <div className={`landing-editor-workspace panel-${panel}`} inert={publishing ? "" : undefined}>
      <aside id="landing-panel-blocks" className="landing-block-list" aria-label="Daftar blok"><header><h2>Susunan halaman</h2><span>{document.blocks.length}/40</span></header>
        {document.blocks.map((block, i) => <div key={block.id} draggable={!recovery} onDragStart={(event) => { dragRef.current = block.id; event.dataTransfer.setData("text/plain", block.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (recoveryPending.current) return; commit(moveLandingBlock(document, dragRef.current, i)); dragRef.current = null; }} className={`landing-block-row${selected === block.id ? " is-selected" : ""}`}><button type="button" onClick={() => select(block.id)} aria-pressed={selected === block.id}><small>{String(i + 1).padStart(2, "0")} · {BLOCK_LABELS[block.type]} {!block.enabled && "· tersembunyi"}</small><strong>{block.props.title || BLOCK_LABELS[block.type]}</strong></button></div>)}
        <button type="button" className="landing-add" disabled={document.blocks.length >= 40 || Boolean(recovery)} onClick={() => setAdding(true)}><Plus size={16} />Tambah blok</button><p className="landing-help">Geser untuk mengurutkan, atau gunakan tombol naik/turun pada pengaturan blok.</p>
      </aside>
      <section id="landing-panel-canvas" className="landing-canvas" aria-label="Kanvas landing"><p className="landing-canvas-note">Pratinjau susunan draft. Buka Preview situs untuk tampilan aslinya.</p><LandingCanvas document={document} selected={selected} onSelect={select} viewport={viewport} /></section>
      <aside id="landing-panel-settings" className="landing-inspector" aria-label="Pengaturan blok"><header><h2 ref={inspectorHeading} tabIndex={-1}>{current ? BLOCK_LABELS[current.type] : "Pengaturan"}</h2><small>Blok terpilih</small></header>
        <fieldset disabled={Boolean(recovery)} className="landing-inspector-fields">{current && <>
          <div className="landing-block-actions"><button type="button" aria-label="Pindah blok ke atas" disabled={currentIndex === 0} onClick={() => commit(moveLandingBlock(document, selected, currentIndex - 1))}><ArrowUp size={16} /></button><button type="button" aria-label="Pindah blok ke bawah" disabled={currentIndex === document.blocks.length - 1} onClick={() => commit(moveLandingBlock(document, selected, currentIndex + 1))}><ArrowDown size={16} /></button><button type="button" aria-label="Duplikat blok" disabled={document.blocks.length >= 40} onClick={duplicate}><Copy size={16} /></button><button type="button" aria-label={current.enabled ? "Sembunyikan blok" : "Tampilkan blok"} aria-pressed={!current.enabled} onClick={() => commit({ ...document, blocks: document.blocks.map((b) => b.id === selected ? { ...b, enabled: !b.enabled } : b) })}>{current.enabled ? <Eye size={16} /> : <EyeOff size={16} />}</button><button type="button" aria-label="Hapus blok" disabled={document.blocks.length === 1} onClick={() => setDeleting(current.id)}><Trash2 size={16} /></button></div>
          <LandingFields key={current.id} spec={landingSchema.blocks[current.type]} value={current.props} onChange={updateProps} />
        </>}<details className="landing-seo-fields"><summary>Metadata halaman</summary><LandingFields spec={landingSchema.definitions.seo} value={document.seo} onChange={(seo) => commit({ ...document, seo })} /></details></fieldset>
      </aside>
    </div>
    <section className="landing-editor-notice"><LandingPublicationStatus published={published} />{!initial.publicationReady && <p>Aktifkan publikasi dengan landing_page_publication_patch.sql.</p>}</section>
    {publishReview && <LandingDialog label="Konfirmasi publikasi landing" busy={publishing} onClose={() => setPublishReview(null)}><h2>Terbitkan landing?</h2><p>{publishReview.firstPublish ? "Ini publikasi pertama landing." : "Perubahan berikut akan mengganti versi publik."}</p><ul>{[...publishReview.changes.added.map((name) => `Tambah: ${name}`), ...publishReview.changes.removed.map((name) => `Hapus: ${name}`), ...publishReview.changes.changed.map((name) => `Ubah: ${name}`), ...(publishReview.changes.reordered ? ["Urutan blok berubah"] : []), ...(publishReview.changes.seo ? ["Metadata SEO berubah"] : [])].map((line, i) => <li key={i}>{line}</li>)}</ul><p>Versi draft {publishReview.version}. Jika admin lain mengubahnya, publikasi akan ditolak.</p><label>Catatan revisi (opsional)<textarea maxLength={1000} value={publishNote} disabled={publishing} onChange={(event) => setPublishNote(event.target.value)} /></label><div className="landing-save-actions"><button type="button" disabled={publishing} onClick={() => setPublishReview(null)}>Batal</button><button type="button" className="landing-primary" disabled={publishing} onClick={publish}>{publishing ? "Menerbitkan…" : "Terbitkan sekarang"}</button></div></LandingDialog>}
    <footer className="landing-editor-footer"><span>{document.blocks.filter((block) => block.enabled).length} blok aktif · {document.blocks.length} total</span><span>Versi draft {status.version || "lokal"} · Autosave 1,2 detik</span><span>Draft tidak mengubah situs publik</span></footer>
    {adding && <LandingDialog label="Tambah blok" onClose={() => setAdding(false)}><header><div><small>Susun halaman Anda</small><h2>Tambah blok</h2></div><button type="button" aria-label="Tutup tambah blok" onClick={() => setAdding(false)}><X size={18} /></button></header><div className="landing-block-catalog">{Object.entries(BLOCK_LABELS).map(([type, label]) => <button type="button" key={type} onClick={() => add(type)}><strong>{label}</strong><span>{({ hero: "Pembuka dan ajakan utama", text: "Paragraf, judul, dan daftar", features: "Manfaat dan keunggulan", imageText: "Cerita dengan gambar", courses: "Pilihan kelas publik", exams: "Modul ujian publik", articles: "Tulisan yang diterbitkan", cta: "Ajakan dengan tombol", faq: "Pertanyaan dan jawaban" })[type]}</span></button>)}</div></LandingDialog>}
    {deleting && <LandingDialog label="Hapus blok" onClose={() => setDeleting(null)}><h2>Hapus blok ini?</h2><p>Blok akan dihapus dari draft. Situs publik tetap menggunakan versi terbit.</p><button type="button" onClick={() => { const blocks = document.blocks.filter((block) => block.id !== deleting); commit({ ...document, blocks }); select(blocks[Math.min(currentIndex, blocks.length - 1)]?.id); setDeleting(null); }}>Hapus dari draft</button><button type="button" onClick={() => setDeleting(null)}>Batal</button></LandingDialog>}
  </main>;
}
