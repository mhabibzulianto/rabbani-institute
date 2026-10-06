"use client";
import { useEffect, useRef, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { workflowActions, REVISION_REASONS, formatPublicationTime } from "@/lib/article-workflow.mjs";
import { reviewEditorialArticle, scheduleEditorialArticle, saveEditorialReviewNote, snapshotEditorialArticle, listArticleRevisions, previewArticleRevision, restoreArticleRevision } from "@/lib/workflow-actions";
import PublicationPreview from "@/components/PublicationPreview";

export default function ArticleWorkflow({ article, admin, status, ready, schedulerReady, getVersion, beforeAction, onChanged, onBusyChange }) {
  const [note, setNote] = useState(article.note || "");
  const [scheduled, setScheduled] = useState(article.scheduled_at);
  const [publicationError, setPublicationError] = useState(article.publication_error);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [revisionPreview, setRevisionPreview] = useState(null);
  const dialogRef = useRef(null);
  const historyRef = useRef(null);
  const revisionRequest = useRef(0);
  useEffect(() => { setNote(article.note || ""); setScheduled(article.scheduled_at); setPublicationError(article.publication_error); }, [article.note,article.scheduled_at,article.publication_error]);
  async function execute(operation) {
    setBusy(true); onBusyChange(true); setError(""); setNotice("");
    try {
      if (!await beforeAction()) { setError("Simpan perubahan artikel sebelum melanjutkan."); return; }
      const result = await operation(getVersion());
      if (!result.ok) { setError(result.error); return; }
      if (result.status) { setScheduled(result.scheduled_at); setPublicationError(result.publication_error); setNote(result.note); onChanged(result); }
      else setNotice("Snapshot berhasil dibuat.");
      dialogRef.current.close();
      if (historyRef.current.open) await loadHistory(1);
    } catch { setError("Koneksi terputus. Muat ulang untuk memeriksa hasil sebelum mencoba lagi."); }
    finally { setBusy(false); onBusyChange(false); }
  }
  async function loadHistory(nextPage = 1) {
    const request = ++revisionRequest.current;
    setHistoryLoading(true); setRevisionPreview(null); setPage(nextPage);
    try { const result = await listArticleRevisions({ id: article.id, page: nextPage }); if (request === revisionRequest.current) setHistory(result); }
    catch { if (request === revisionRequest.current) setHistory({ ok: false, error: "Riwayat belum dapat dimuat. Coba lagi.", items: [] }); }
    finally { if (request === revisionRequest.current) setHistoryLoading(false); }
  }
  async function showRevision(id) {
    const request = ++revisionRequest.current;
    setHistoryLoading(true);
    try { const result = await previewArticleRevision({ id: article.id, revisionId: id }); if (request === revisionRequest.current) { if (result.ok) setRevisionPreview(result.preview); else setError(result.error); } }
    catch { setError("Preview revisi belum dapat dimuat."); }
    finally { if (request === revisionRequest.current) setHistoryLoading(false); }
  }
  const confirm = (action) => { setError(""); setConfirmation(action); dialogRef.current.showModal(); };
  return <section className="writing-workflow" aria-label="Workflow artikel">
    {note && <div className="writing-review-note"><strong>Catatan redaksi</strong><p>{note}</p></div>}
    <details><summary>Status, review, dan revisi</summary><div className="writing-workflow-content">
      {!ready && <p className="writing-notice">Review, penjadwalan, dan riwayat revisi tersedia setelah pembaruan database diterapkan.</p>}
      {scheduled && <p>Jadwal publikasi: <strong>{formatPublicationTime(scheduled)}</strong></p>}
      {publicationError && <p role="alert" className="writing-notice writing-notice-error">{publicationError}</p>}
      {admin && status === "submitted" && <label>Catatan untuk penulis<textarea value={note} maxLength={4000} rows={3} disabled={busy || !ready} onChange={(event) => setNote(event.target.value)} placeholder="Jelaskan hasil review dan bagian yang perlu diperbaiki…" /></label>}
      <div className="writing-workflow-actions">{workflowActions(admin,status).map((action) => <button type="button" key={action.status} disabled={busy || !ready} onClick={() => confirm({ type: "review", ...action })}>{action.label}</button>)}
        {admin && status === "submitted" && <button type="button" disabled={busy || !ready} onClick={() => execute((version) => saveEditorialReviewNote({ id:article.id,version,note }))}>Simpan catatan</button>}
        <button type="button" disabled={busy} onClick={() => { setError(""); historyRef.current.showModal(); loadHistory(); }}>Riwayat revisi</button>
        <button type="button" disabled={busy || !ready} onClick={() => execute((version) => snapshotEditorialArticle({ id: article.id, version }))}>Buat snapshot</button>
      </div>
      {admin && status === "submitted" && <div className="writing-schedule"><label>Publikasi terjadwal · Jakarta (UTC+7)<input type="datetime-local" value={time} disabled={busy || !ready || !schedulerReady} onChange={(event) => setTime(event.target.value)} /></label>{!schedulerReady && <p className="writing-notice">Publikasi otomatis belum aktif. Penjadwalan tersedia setelah scheduler database diaktifkan.</p>}<div className="writing-workflow-actions"><button type="button" disabled={busy || !ready || !schedulerReady || !time} onClick={() => confirm({ type: "schedule", label: "Jadwalkan publikasi" })}>Jadwalkan</button>{scheduled && <button type="button" disabled={busy || !ready} onClick={() => confirm({ type: "cancel", label: "Batalkan jadwal" })}>Batalkan jadwal</button>}</div></div>}
      {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="writing-notice writing-notice-error">{error}</p>}
    </div></details>
    <dialog ref={dialogRef} className="writing-dialog" aria-labelledby="workflow-confirm-title" onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <div className="writing-dialog-heading"><h2 id="workflow-confirm-title">{confirmation?.label}</h2><button type="button" aria-label="Tutup konfirmasi workflow" disabled={busy} onClick={() => dialogRef.current.close()}><Cross2Icon /></button></div>
      <p>{confirmation?.type === "restore" ? "Isi, judul, ringkasan, kategori, tag, topik, dan cover akan diganti dengan revisi ini. Versi saat ini disimpan sebagai snapshot. Status, slug, penulis, dan catatan redaksi tetap dipertahankan." : confirmation?.status === "archived" ? "Artikel tidak lagi tampil di situs publik. Isi tetap tersedia di arsip." : confirmation?.type === "schedule" ? `Artikel akan terbit otomatis pada ${time.replace("T"," ")} (Jakarta).` : confirmation?.status === "published" ? "Artikel akan dapat dibaca publik. Perubahan terakhir disimpan terlebih dahulu." : "Perubahan terakhir disimpan, kemudian status artikel diperbarui."}</p>
      {confirmation?.status === "rejected" && <p>Alasan revisi wajib diisi pada catatan untuk penulis.</p>}
      {error && <p role="alert">{error}</p>}
      <div className="writing-dialog-actions"><button type="button" disabled={busy} onClick={() => dialogRef.current.close()}>Batal</button><button type="button" className="writing-publish" disabled={busy} onClick={() => execute((version) => confirmation.type === "restore" ? restoreArticleRevision({ id:article.id, version, revisionId:confirmation.revisionId }) : confirmation.type === "review" ? reviewEditorialArticle({ id: article.id, version, status: confirmation.status, note }) : scheduleEditorialArticle({ id: article.id, version, time, cancel: confirmation.type === "cancel" }))}>{busy ? "Memproses…" : "Konfirmasi"}</button></div>
    </dialog>
    <dialog ref={historyRef} className="writing-dialog revision-dialog" aria-labelledby="revision-history-title" onClose={() => { revisionRequest.current++; }}>
      <div className="writing-dialog-heading"><h2 id="revision-history-title">{revisionPreview ? `Preview revisi ${revisionPreview.revision_number}` : "Riwayat revisi"}</h2><button type="button" aria-label="Tutup riwayat revisi" onClick={() => historyRef.current.close()}><Cross2Icon /></button></div>
      {error && <p role="alert">{error}</p>}
      {historyLoading ? <p role="status">Memuat revisi…</p> : revisionPreview ? <><button type="button" className="writing-save-button" onClick={() => setRevisionPreview(null)}>← Kembali ke riwayat</button><PublicationPreview preview={revisionPreview} author={article.author} date={formatPublicationTime(revisionPreview.created_at)} /></> : history?.ok ? <>{!history.items.length ? <p>Belum ada snapshot. Snapshot dibuat saat submit, review, publikasi, dan secara berkala saat penyimpanan.</p> : <ol className="revision-list">{history.items.map((item) => <li key={item.id}><div><strong>Revisi {item.revision_number} · {REVISION_REASONS[item.reason] || item.reason}</strong><p>{item.metadata_json.title}</p><small>{formatPublicationTime(item.created_at)} · versi {item.article_version}</small></div><button type="button" onClick={() => showRevision(item.id)}>Lihat</button></li>)}</ol>}<div className="media-pagination"><button type="button" disabled={page === 1} onClick={() => loadHistory(page-1)}>Sebelumnya</button><span>{page} / {Math.max(1, Math.ceil(history.total/10))}</span><button type="button" disabled={page*10 >= history.total} onClick={() => loadHistory(page+1)}>Berikutnya</button></div></> : <div><p>{history?.error}</p><button type="button" onClick={() => loadHistory(page)}>Coba lagi</button></div>}
      {revisionPreview && <button type="button" className="writing-publish" disabled={busy || !ready || !["draft", "rejected"].includes(status)} onClick={() => confirm({ type:"restore", revisionId:revisionPreview.id, label:`Pulihkan revisi ${revisionPreview.revision_number}` })}>Pulihkan revisi ini</button>}
      <p className="revision-history-hint">Pemulihan tersedia pada draft atau artikel yang perlu revisi. Versi saat ini dicadangkan sebelum isi dan metadata dipulihkan.</p>
    </dialog>
  </section>;
}
