"use client";
import { useEffect, useState } from "react";
export default function LandingPreviewShell({ ready }) {
  const [viewport, setViewport] = useState("desktop");
  const [message, setMessage] = useState("Menyiapkan preview…");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get("ticket");
    if (!ticket) { if (!ready) setMessage("Buka preview baru melalui editor Halaman utama."); return; }
    window.history.replaceState(null, "", "/landing-preview");
    const form = document.createElement("form"); form.method = "POST"; form.action = "/api/landing-preview";
    const input = document.createElement("input"); input.type = "hidden"; input.name = "ticket"; input.value = ticket;
    form.append(input); document.body.append(form); form.submit();
  }, [ready]);
  if (!ready) return <main className="section"><p role="status">{message}</p></main>;
  return <main className="landing-preview-shell"><div className="landing-preview-controls"><strong>Preview draft · belum diterbitkan</strong><div><button type="button" aria-pressed={viewport === "desktop"} onClick={() => setViewport("desktop")}>Desktop</button><button type="button" aria-pressed={viewport === "mobile"} onClick={() => setViewport("mobile")}>Mobile</button></div><span>Sesi berlaku 30 menit</span></div>{loading && <p role="status">Memuat tampilan situs utama…</p>}<iframe title="Preview landing situs utama" src="/landing-preview/canvas" onLoad={() => setLoading(false)} style={{ width: viewport === "mobile" ? "390px" : "100%", maxWidth: "100%", height: "80vh", border: "1px solid #dce4eb", margin: "16px auto", display: "block", background: "white" }} /></main>;
}
