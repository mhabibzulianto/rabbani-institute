"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LandingDialog from "./LandingDialog";
import { restoreLandingRevision, previewLandingRevision } from "@/lib/landing-publication-actions";
import "./landing-editor.css";

export default function LandingHistory({ revisions, version, currentRevision }) {
  const router = useRouter();
  const [restoring, setRestoring] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const date = (value) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
  async function restore() {
    setBusy(true); setMessage("");
    try {
      const result = await restoreLandingRevision({ revision: restoring, version });
      if (result.ok) { setRestoring(null); router.push("/halaman-utama/edit"); router.refresh(); }
      else { setMessage(result.error); setRestoring(null); }
    } catch { setMessage("Hasil restore belum terkonfirmasi. Muat ulang untuk memeriksa draft."); setRestoring(null); }
    finally { setBusy(false); }
  }
  async function preview(id) {
    const tab = window.open("about:blank", "_blank"); if (tab) tab.opener = null;
    setBusy(true); setMessage("");
    try {
      const result = await previewLandingRevision(id);
      if (!result.ok) { tab?.close(); setMessage(result.error); return; }
      if (tab) tab.location.href = result.url; else window.location.assign(result.url);
    } catch { tab?.close(); setMessage("Preview revisi gagal dibuka."); }
    finally { setBusy(false); }
  }
  return <section className="landing-history"><p role="status">{message}</p>{!revisions.length && <p>Belum ada revisi terbit.</p>}{revisions.map((revision) => <article className="placeholder-panel" key={revision.id}><h2>Revisi {revision.id}{currentRevision === revision.id ? " · sedang terbit" : ""}</h2><p>Draft versi {revision.draft_version} · {date(revision.created_at)} WIB</p><p>{revision.note || "Tanpa catatan revisi."}</p><div className="landing-history-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => preview(revision.id)}>Preview revisi</button><button type="button" className="secondary-button" disabled={busy} onClick={() => setRestoring(revision.id)}>Pulihkan sebagai draft</button></div></article>)}{restoring && <LandingDialog label="Pulihkan revisi sebagai draft" busy={busy} onClose={() => setRestoring(null)}><h2>Pulihkan revisi {restoring}?</h2><p>Isi draft saat ini akan diganti oleh revisi ini. Versi publik tetap tampil sampai Anda memeriksa dan menerbitkan draft hasil pemulihan.</p><p>Salinan lokal di editor akan diperiksa sebagai konflik versi saat dibuka kembali.</p><button type="button" className="primary-button" disabled={busy} onClick={restore}>{busy ? "Memulihkan…" : "Pulihkan draft"}</button><button type="button" className="secondary-button" disabled={busy} onClick={() => setRestoring(null)}>Batal</button></LandingDialog>}</section>;
}
