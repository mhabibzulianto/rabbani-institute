"use client";
export default function Error({ reset }) {
  return <main className="page-shell"><h1>Draft belum dapat dimuat</h1><p>Periksa koneksi dan pastikan patch landing page sudah diterapkan.</p><button type="button" onClick={reset}>Coba lagi</button></main>;
}
