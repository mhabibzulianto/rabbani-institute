"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { retryLandingSync } from "@/lib/landing-publication-actions";
export default function LandingPublicationStatus({ published }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [acknowledged, setAcknowledged] = useState(null);
  async function retry() {
    setBusy(true); setMessage("");
    try { const result = await retryLandingSync(published.revision); if (result.ok && result.synced) setAcknowledged(published.revision); setMessage(result.ok ? result.synced ? "Sinkronisasi berhasil." : result.syncError : result.error); router.refresh(); }
    catch { setMessage("Sinkronisasi belum terkonfirmasi. Coba lagi."); }
    finally { setBusy(false); }
  }
  if (!published) return <p>Belum pernah diterbitkan. Situs menggunakan konten default.</p>;
  const synced = published.synced || acknowledged === published.revision;
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(published.publishedAt));
  return <div className="landing-publication-status"><p>Terbit · revisi {published.revision} · {date} WIB</p><p role="status">{synced ? "Cache situs utama sudah disinkronkan." : "Publikasi berhasil. Sinkronisasi situs utama tertunda."} {message}</p>{!synced && <><p>{published.syncError || "Situs memakai cache maksimal 5 menit. Coba sinkronisasi untuk memperbarui lebih cepat."}</p><button type="button" className="secondary-button" disabled={busy} onClick={retry}>{busy ? "Menyinkronkan…" : "Coba sinkronisasi lagi"}</button></>}</div>;
}
