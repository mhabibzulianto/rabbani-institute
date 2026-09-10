import Link from "next/link";

export default function AuthShell({ children }) {
  return (
    <main className="editorial-auth-page">
      <section className="editorial-auth-shell">
        <div className="editorial-auth-aside">
          <div className="editorial-site-badge">
            <div className="editorial-site-avatar">ER</div>
            <span>Editorial rabbani-institute</span>
          </div>
          <div className="editorial-auth-copy">
            <p className="editorial-kicker">ADMIN LOGIN</p>
            <h1>Kelola artikel Anda dengan tenang dan terarah.</h1>
            <p>
              Masuk untuk mengakses dasbor editorial, mengelola artikel, media, serta percakapan dengan pembaca
              dalam satu ruang kerja.
            </p>
          </div>
          <div className="editorial-auth-footer">
            <span>(C) 2026 rabbani-institute</span>
            <Link href="https://www.rabbaniinstitute.id">Kembali ke beranda</Link>
          </div>
        </div>

        <div className="editorial-auth-panel">{children}</div>
      </section>
    </main>
  );
}
