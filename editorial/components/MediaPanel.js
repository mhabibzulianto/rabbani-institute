"use client";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, FileIcon, VideoIcon, SpeakerLoudIcon } from "@radix-ui/react-icons";
import { listEditorialMedia } from "@/lib/media-actions";
import { MEDIA_ACCEPT, MEDIA_LABELS, safeMediaUrl, validateMediaMetadata } from "@/lib/media-validation.mjs";
const icons = { image: ImageIcon, video: VideoIcon, audio: SpeakerLoudIcon, document: FileIcon };
const sizeLabel = (size) => `${(Number(size) / 1048576).toFixed(1)} MB`;
function Thumbnail({ asset }) {
  const Icon = icons[asset.kind] || FileIcon;
  // eslint-disable-next-line @next/next/no-img-element
  return asset.kind === "image" ? <img src={asset.url} alt={asset.alt || ""} loading="lazy" /> : <Icon aria-hidden="true" />;
}
export default function MediaPanel({ onChoose, imagesOnly = false, browseOnly = false, initialAsset = null, onBusyChange }) {
  const [tab, setTab] = useState(initialAsset ? "url" : "library");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState(imagesOnly ? "image" : "");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(initialAsset);
  const [values, setValues] = useState({ url: initialAsset?.url || "", kind: initialAsset?.kind || "image", alt: initialAsset?.alt || "", caption: initialAsset?.caption || "", filename: initialAsset?.filename || "" });
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const latestLoad = useRef(0);
  useEffect(() => {
    const request = ++latestLoad.current;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try { const result = await listEditorialMedia({ q, kind, page }); if (!cancelled && request === latestLoad.current) { setLibrary(result); setLoading(false); } }
      catch { if (!cancelled && request === latestLoad.current) { setLibrary({ ok: false, error: "Koneksi terputus. Coba muat ulang pustaka media.", items: [], total: 0 }); setLoading(false); } }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, kind, page, revision]);
  function change(key, value) { setValues((current) => ({ ...current, [key]: value })); }
  function select(asset) { setSelected(asset); setValues({ url: asset.url, kind: asset.kind, alt: asset.alt || "", caption: asset.caption || "", filename: asset.name || asset.filename || "" }); setError(""); }
  async function upload(event) {
    event.preventDefault(); setError("");
    if (!file) { setError("Pilih file terlebih dahulu."); return; }
    try { const metadata = validateMediaMetadata({ name: file.name, type: file.type, size: file.size, alt: values.alt, caption: values.caption }); if (imagesOnly && metadata.kind !== "image") throw new Error("Cover harus berupa gambar."); }
    catch (problem) { setError(problem.message); return; }
    setBusy(true); onBusyChange?.(true);
    try {
      const form = new FormData(); form.set("file", file); form.set("alt", values.alt); form.set("caption", values.caption);
      const response = await fetch("/api/editorial/media/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Upload gagal. Coba lagi.");
      select(result.asset); setFile(null); if (fileRef.current) fileRef.current.value = "";
      setPage(1); setRevision((value) => value + 1); setTab("library");
      if (!browseOnly) onChoose(result.asset);
    } catch (problem) { setError(problem.message || "Koneksi terputus. Upload belum selesai."); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  function insert() {
    if (!safeMediaUrl(values.url)) { setError("Gunakan URL media lengkap dengan https:// atau http://."); return; }
    onChoose({ ...selected, ...values, url: values.url.trim(), name: values.filename });
  }
  const metadataFields = <>
    {(imagesOnly || values.kind === "image") && <label>Alt text <span>(opsional)</span><input maxLength={500} value={values.alt} onChange={(event) => change("alt", event.target.value)} placeholder="Deskripsi gambar untuk pembaca layar" disabled={busy || browseOnly && tab !== "upload"} /></label>}
    <label>Caption <span>(opsional)</span><textarea rows={2} maxLength={500} value={values.caption} onChange={(event) => change("caption", event.target.value)} disabled={busy || browseOnly && tab !== "upload"} /></label>
  </>;
  return <div className="media-panel">
    <div className="media-tabs" aria-label="Sumber media">{[["library", "Pustaka media"], ["upload", "Upload baru"], ...(!browseOnly ? [["url", "Dari URL"]] : [])].map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} disabled={busy} onClick={() => { setTab(value); setError(""); }}>{label}</button>)}</div>
    {tab === "library" && <>
      <div className="media-filters"><input aria-label="Cari media" placeholder="Cari nama file…" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} />{!imagesOnly && <select aria-label="Jenis media" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="">Semua jenis</option>{Object.entries(MEDIA_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div>
      {loading ? <p role="status" className="media-empty">Memuat media…</p> : !library?.ok ? <div className="media-empty"><p>{library?.error}</p><button type="button" onClick={() => setRevision((value) => value + 1)}>Muat ulang</button></div> : !library.items.length ? <p className="media-empty">{q || kind && !imagesOnly ? "Tidak ada media yang cocok." : "Belum ada media. Mulai dengan upload baru."}</p> : <>
        <div className="media-grid">{library.items.map((asset) => <button type="button" key={asset.id} className={`media-card${selected?.id === asset.id ? " is-selected" : ""}`} aria-pressed={selected?.id === asset.id} onClick={() => select(asset)}><span className="media-thumbnail"><Thumbnail asset={asset} /></span><strong>{asset.name}</strong><small>{MEDIA_LABELS[asset.kind]} · {sizeLabel(asset.size_bytes)}</small></button>)}</div>
        <div className="media-pagination"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button><span>{page} / {Math.max(1, Math.ceil(library.total / 24))}</span><button type="button" disabled={page * 24 >= library.total} onClick={() => setPage((value) => value + 1)}>Berikutnya</button></div>
      </>}
      {selected && <div className="media-selection"><strong>{selected.name || selected.filename || "Media terpilih"}</strong>{metadataFields}{browseOnly ? <><p>{sizeLabel(selected.size_bytes)} · {new Date(selected.created_at).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</p><label>URL media<input readOnly value={selected.url} onFocus={(event) => event.target.select()} /></label><a href={selected.url} target="_blank" rel="noopener noreferrer">Buka file ↗</a></> : <button type="button" className="writing-publish" onClick={insert}>Gunakan media</button>}</div>}
    </>}
    {tab === "upload" && <form className="media-upload" onSubmit={upload}><label>File<input ref={fileRef} type="file" accept={imagesOnly ? "image/jpeg,image/png,image/webp,image/gif" : MEDIA_ACCEPT} disabled={busy} onChange={(event) => { const next = event.target.files?.[0] || null; setFile(next); if (next) change("kind", next.type.split("/")[0]); }} /></label><p>Gambar maksimal 10 MB. Video, audio, dan PDF maksimal 50 MB. Media dapat diakses melalui tautannya.</p>{metadataFields}<button type="submit" className="writing-publish" disabled={busy || !file}>{busy ? "Mengunggah…" : browseOnly ? "Upload media" : "Upload dan gunakan"}</button></form>}
    {tab === "url" && <div className="media-upload">{!imagesOnly && <label>Jenis<select value={values.kind} onChange={(event) => change("kind", event.target.value)}>{Object.entries(MEDIA_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}<label>URL media<input type="url" value={values.url} placeholder="https://" maxLength={2000} onChange={(event) => change("url", event.target.value)} /></label><label>Nama file <span>(opsional)</span><input value={values.filename} maxLength={255} onChange={(event) => change("filename", event.target.value)} /></label>{metadataFields}<button type="button" className="writing-publish" onClick={insert}>{initialAsset ? "Terapkan perubahan" : "Gunakan media"}</button></div>}
    {error && <p role="alert" className="writing-notice writing-notice-error">{error}</p>}
  </div>;
}
