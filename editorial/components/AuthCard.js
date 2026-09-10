"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, signIn, updatePassword } from "@/app/actions";

function SubmitButton({ label }) {
  const { pending } = useFormStatus();

  return (
    <button className="editorial-submit" type="submit" disabled={pending}>
      {pending ? "Memproses..." : label}
    </button>
  );
}

function Notice({ type, text }) {
  if (!text) return null;
  return <div className={`notice ${type}`}>{text}</div>;
}

export default function AuthCard({ mode, next = "/beranda", error, message, identifier = "" }) {
  if (mode === "forgot-password") {
    return (
      <>
        <div className="editorial-auth-heading">
          <h2>Lupa Kata Sandi</h2>
          <p>Masukkan email akun editorial Anda untuk menerima tautan reset password.</p>
        </div>
        <Notice type="error" text={error} />
        <Notice type="success" text={message} />
        <form className="editorial-auth-form" action={requestPasswordReset}>
          <input type="hidden" name="next" value={next} />
          <label>
            <span>Email</span>
            <input name="identifier" type="email" placeholder="admin@rabbaniinstitute.id" defaultValue={identifier} required />
          </label>
          <SubmitButton label="Kirim tautan reset" />
        </form>
        <p className="editorial-auth-helper">
          Sudah ingat password? <Link href={`/auth?next=${encodeURIComponent(next)}`}>Kembali ke login</Link>
        </p>
      </>
    );
  }

  if (mode === "reset-password") {
    return (
      <>
        <div className="editorial-auth-heading">
          <h2>Password Baru</h2>
          <p>Setelah disimpan, Anda bisa masuk lagi ke dashboard editorial.</p>
        </div>
        <Notice type="error" text={error} />
        <Notice type="success" text={message} />
        <form className="editorial-auth-form" action={updatePassword}>
          <input type="hidden" name="next" value={next} />
          <label>
            <span>Password baru</span>
            <input name="password" type="password" placeholder="Masukkan password baru" required />
          </label>
          <label>
            <span>Konfirmasi password</span>
            <input name="confirmPassword" type="password" placeholder="Ulangi password" required />
          </label>
          <SubmitButton label="Simpan password" />
        </form>
      </>
    );
  }

  return (
    <>
      <div className="editorial-auth-heading">
        <h2>Selamat Datang</h2>
        <p>Masukkan email dan kata sandi Anda untuk membuka panel admin.</p>
      </div>
      <Notice type="error" text={error} />
      <Notice type="success" text={message} />
      <form className="editorial-auth-form" action={signIn}>
        <input type="hidden" name="next" value={next} />
        <label>
          <span>Email</span>
          <input name="identifier" type="email" placeholder="admin@rabbaniinstitute.id" defaultValue={identifier} required />
        </label>
        <label>
          <span>Kata Sandi</span>
          <input name="password" type="password" placeholder="Masukkan kata sandi" required />
        </label>
        <div className="editorial-auth-meta">
          <label className="editorial-checkbox">
            <input type="checkbox" name="remember" />
            <span>Ingat Saya</span>
          </label>
          <Link href={`/auth/lupa?next=${encodeURIComponent(next)}`}>Lupa Kata Sandi?</Link>
        </div>
        <SubmitButton label="Masuk" />
      </form>
      <p className="editorial-auth-helper">
        Belum punya akun? <strong>Hubungi administrator</strong>
      </p>
    </>
  );
}
