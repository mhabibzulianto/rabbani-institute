"use client";
import Link from "next/link";
export default function EditorError({ reset }) {
  return <div className="writing-loading"><h1>Editor belum dapat dimuat</h1><p>Periksa koneksi lalu coba lagi.</p><button className="secondary-button" onClick={reset}>Coba lagi</button><Link href="/artikel">Kembali ke daftar artikel</Link></div>;
}
