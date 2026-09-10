"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { requestPasswordReset, signUp, updatePassword } from "@/app/actions";
import AuthSocialButtons from "@/components/AuthSocialButtons";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeLanguage } from "@/lib/i18n";
import {
  buildWhatsappAuthEmail,
  normalizeEmailIdentifier,
  looksLikeEmail,
  looksLikeWhatsapp,
  normalizeWhatsappIdentifier,
} from "@/lib/auth-identifiers";
import { formatWhatsappNumber } from "@/lib/exam-utils";

function parseRetrySeconds(text) {
  if (!text) {
    return null;
  }

  const secondsMatch = text.match(/after\s+(\d+)\s+second/i);
  if (secondsMatch) {
    return Number(secondsMatch[1]);
  }

  const minutesSecondsMatch = text.match(/after\s+(\d+)\s+minutes?(?:\s+and\s+(\d+)\s+seconds?)?/i);
  if (minutesSecondsMatch) {
    const minutes = Number(minutesSecondsMatch[1] || 0);
    const seconds = Number(minutesSecondsMatch[2] || 0);
    return (minutes * 60) + seconds;
  }

  return null;
}

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) {
    return "0 detik";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes} menit ${seconds} detik`;
  }

  return `${seconds} detik`;
}

function translateAuthError(error, countdownSeconds) {
  if (!error) {
    return null;
  }

  const normalizedError = error.trim();

  if (/For security purposes, you can only request this after/i.test(normalizedError)) {
    if (typeof countdownSeconds === "number" && countdownSeconds > 0) {
      return `Demi keamanan, Anda bisa mencoba lagi dalam ${formatCountdown(countdownSeconds)}.`;
    }

    if (countdownSeconds === 0) {
      return "Anda sudah bisa mencoba lagi sekarang.";
    }

    return "Demi keamanan, silakan coba lagi sebentar lagi.";
  }

  if (/Invalid login credentials/i.test(normalizedError)) {
    return "Email atau password tidak sesuai.";
  }

  if (/Email rate limit exceeded/i.test(normalizedError)) {
    return "Terlalu banyak percobaan email. Silakan tunggu sebentar lalu coba lagi.";
  }

  if (/User already registered/i.test(normalizedError)) {
    return "Akun ini sudah terdaftar. Silakan masuk atau reset password.";
  }

  if (/Email not confirmed/i.test(normalizedError)) {
    return "Email ini belum dikonfirmasi. Silakan cek inbox Anda lalu klik tautan konfirmasi.";
  }

  if (/Invalid email/i.test(normalizedError)) {
    return "Format email tidak valid.";
  }

  if (/Password should be at least/i.test(normalizedError) || /Password should contain/i.test(normalizedError)) {
    return "Password belum memenuhi syarat keamanan. Gunakan password yang lebih kuat.";
  }

  if (/Password is too short/i.test(normalizedError) || /should be at least 6 characters/i.test(normalizedError)) {
    return "Password minimal 6 karakter.";
  }

  if (/Unable to validate email address/i.test(normalizedError)) {
    return "Alamat email tidak dapat diverifikasi. Silakan gunakan email lain.";
  }

  if (/Signups not allowed for this instance/i.test(normalizedError) || /Signup is disabled/i.test(normalizedError)) {
    return "Pendaftaran akun sedang dinonaktifkan.";
  }

  if (/Email link is invalid or has expired/i.test(normalizedError)) {
    return "Tautan email tidak valid atau sudah kedaluwarsa.";
  }

  if (/Token has expired or is invalid/i.test(normalizedError)) {
    return "Sesi atau tautan autentikasi sudah tidak berlaku. Silakan coba lagi.";
  }

  if (/Too many requests/i.test(normalizedError) || /rate limit/i.test(normalizedError)) {
    return "Terlalu banyak percobaan. Silakan tunggu sebentar lalu coba lagi.";
  }

  if (/User not found/i.test(normalizedError)) {
    return "Akun tidak ditemukan.";
  }

  if (/Anonymous sign-ins are disabled/i.test(normalizedError)) {
    return "Mode login anonim tidak diaktifkan.";
  }

  if (/provider is not enabled/i.test(normalizedError)) {
    return "Metode login ini belum diaktifkan.";
  }

  if (/network/i.test(normalizedError) && /error/i.test(normalizedError)) {
    return "Koneksi sedang bermasalah. Silakan cek internet Anda lalu coba lagi.";
  }

  return normalizedError;
}

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error || "Terjadi kesalahan. Silakan coba lagi.";
    const error = new Error(message);
    error.payload = payload;
    throw error;
  }

  return payload;
}

export default function AuthForms({
  mode = "login",
  next = "https://madrasah.rabbaniinstitute.id/beranda",
  language = "id",
  error,
  message,
  info,
  identifier = "",
  method = "email",
}) {
  const preferredLanguage = normalizeLanguage(language);
  const initialRetrySeconds = useMemo(() => parseRetrySeconds(error), [error]);
  const [retrySeconds, setRetrySeconds] = useState(initialRetrySeconds);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginClientError, setLoginClientError] = useState("");
  const [oauthError, setOauthError] = useState("");
  const [registerMethod, setRegisterMethod] = useState(method === "whatsapp" ? "whatsapp" : "email");
  const [forgotMethod, setForgotMethod] = useState(method === "whatsapp" ? "whatsapp" : "email");
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerClientError, setRegisterClientError] = useState("");
  const [registerClientNotice, setRegisterClientNotice] = useState("");
  const [registerPhonePreview, setRegisterPhonePreview] = useState(identifier && method === "whatsapp" ? formatWhatsappNumber(identifier) : "");
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetClientError, setResetClientError] = useState("");
  const [resetClientNotice, setResetClientNotice] = useState("");
  const [resetPhonePreview, setResetPhonePreview] = useState(identifier && method === "whatsapp" ? formatWhatsappNumber(identifier) : "");
  const authPanelRef = useRef(null);
  const registerWhatsappFormRef = useRef(null);
  const resetWhatsappFormRef = useRef(null);
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const localizedError = translateAuthError(error, retrySeconds);
  const switcherItems = getSwitcherItems(mode, next);
  const panelCopy = getPanelCopy(mode);
  const successMeta = getSuccessMeta({ mode, message, identifier, next });

  useEffect(() => {
    setRetrySeconds(initialRetrySeconds);
  }, [initialRetrySeconds]);

  useEffect(() => {
    if (typeof retrySeconds !== "number" || retrySeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRetrySeconds((current) => {
        if (typeof current !== "number" || current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retrySeconds]);

  useEffect(() => {
    setRegisterMethod(method === "whatsapp" ? "whatsapp" : "email");
    setForgotMethod(method === "whatsapp" ? "whatsapp" : "email");
  }, [method]);

  useEffect(() => {
    if (!authPanelRef.current || typeof window === "undefined") {
      return;
    }

    const shouldScroll = window.location.hash === "#auth-panel" || mode === "register" || mode === "forgot-password";

    if (!shouldScroll) {
      return;
    }

    const timer = window.setTimeout(() => {
      authPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);

    return () => window.clearTimeout(timer);
  }, [mode]);

  async function handleWhatsappRegisterOtpRequest() {
    if (!registerWhatsappFormRef.current) {
      return;
    }

    const formData = new FormData(registerWhatsappFormRef.current);
    const payload = Object.fromEntries(formData.entries());

    setRegisterLoading(true);
    setRegisterClientError("");
    setRegisterClientNotice("");
    setOauthError("");

    try {
      const data = await parseJsonResponse(await fetch("/api/auth/send-whatsapp-signup-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          next,
          preferredLanguage,
        }),
      }));

      setRegisterOtpSent(true);
      setRegisterPhonePreview(data.phone || formatWhatsappNumber(payload.phoneNumber));
      setRegisterClientNotice(`Kode OTP sudah dikirim ke ${data.phone || formatWhatsappNumber(payload.phoneNumber)}.`);
    } catch (requestError) {
      if (requestError.payload?.redirectToForgot && requestError.payload?.forgotUrl) {
        window.location.assign(requestError.payload.forgotUrl);
        return;
      }

      setRegisterClientError(requestError.message || "Gagal mengirim OTP WhatsApp.");
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleWhatsappRegisterSubmit(event) {
    event.preventDefault();

    if (!registerWhatsappFormRef.current) {
      return;
    }

    const formData = new FormData(registerWhatsappFormRef.current);
    const payload = Object.fromEntries(formData.entries());

    setRegisterLoading(true);
    setRegisterClientError("");
    setRegisterClientNotice("");
    setOauthError("");

    try {
      const data = await parseJsonResponse(await fetch("/api/auth/complete-whatsapp-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          preferredLanguage,
        }),
      }));

      window.location.assign(`/auth?message=${encodeURIComponent(data.message || "Akun berhasil dibuat. Silakan masuk.")}&next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(payload.phoneNumber?.toString() || "")}`);
    } catch (requestError) {
      if (requestError.payload?.redirectToForgot) {
        const forgotUrl = `/auth/forgot-password?method=whatsapp&identifier=${encodeURIComponent(payload.phoneNumber?.toString() || "")}&message=${encodeURIComponent("Nomor WhatsApp ini sudah pernah didaftarkan. Silakan verifikasi OTP untuk mengatur ulang password.")}&context=registered&next=${encodeURIComponent(next)}`;
        window.location.assign(forgotUrl);
        return;
      }

      setRegisterClientError(requestError.message || "Gagal menyelesaikan pendaftaran WhatsApp.");
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleWhatsappResetOtpRequest() {
    if (!resetWhatsappFormRef.current) {
      return;
    }

    const formData = new FormData(resetWhatsappFormRef.current);
    const payload = Object.fromEntries(formData.entries());

    setResetLoading(true);
    setResetClientError("");
    setResetClientNotice("");
    setOauthError("");

    try {
      const data = await parseJsonResponse(await fetch("/api/auth/send-whatsapp-reset-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }));

      setResetOtpSent(true);
      setResetPhonePreview(data.phone || formatWhatsappNumber(payload.phoneNumber));
      setResetClientNotice(`Kode OTP sudah dikirim ke ${data.phone || formatWhatsappNumber(payload.phoneNumber)}.`);
    } catch (requestError) {
      setResetClientError(requestError.message || "Gagal mengirim OTP reset password.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleWhatsappResetSubmit(event) {
    event.preventDefault();

    if (!resetWhatsappFormRef.current) {
      return;
    }

    const formData = new FormData(resetWhatsappFormRef.current);
    const payload = Object.fromEntries(formData.entries());

    setResetLoading(true);
    setResetClientError("");
    setResetClientNotice("");

    try {
      const data = await parseJsonResponse(await fetch("/api/auth/complete-whatsapp-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }));

      window.location.assign(`/auth?message=${encodeURIComponent(data.message || "Password berhasil diperbarui.")}&next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(payload.phoneNumber?.toString() || "")}`);
    } catch (requestError) {
      setResetClientError(requestError.message || "Gagal mengganti password lewat WhatsApp.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleClientSignIn(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const identifierValue = String(formData.get("identifier") || "").trim();
    const password = String(formData.get("password") || "");

    setLoginLoading(true);
    setLoginClientError("");
    setOauthError("");

    try {
      let email = normalizeEmailIdentifier(identifierValue);

      if (!looksLikeEmail(identifierValue)) {
        if (!looksLikeWhatsapp(identifierValue)) {
          throw new Error("Masukkan email atau nomor WhatsApp yang valid.");
        }

        const resolved = await parseJsonResponse(await fetch("/api/auth/resolve-login-identifier", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ identifier: identifierValue }),
        }));

        email = resolved.email || buildWhatsappAuthEmail(normalizeWhatsappIdentifier(identifierValue));
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.refresh();
      window.location.assign(next);
    } catch (signInError) {
      const retryAfter = parseRetrySeconds(signInError?.message);
      if (typeof retryAfter === "number") {
        setRetrySeconds(retryAfter);
      }
      setLoginClientError(translateAuthError(signInError?.message || "Gagal masuk.", retryAfter) || "Gagal masuk.");
    } finally {
      setLoginLoading(false);
    }
  }

  if (mode === "register") {
    return (
      <div className="auth-single">
        <div ref={authPanelRef} id="auth-panel" className="panel form-panel auth-panel">
          <AuthSwitcher items={switcherItems} />
          <div className="auth-panel-header">
            <p className="section-label">Register</p>
            <h2>Buat akun Rabbani</h2>
            <p className="auth-panel-copy">{panelCopy}</p>
          </div>
          {localizedError ? <p className="notice error" role="alert">{localizedError}</p> : null}
          {info ? <p className="notice info" role="status">{info}</p> : null}
          {oauthError ? <p className="notice error" role="alert">{oauthError}</p> : null}
          {message ? <SuccessNotice meta={successMeta} /> : null}
          <AuthSocialButtons next={next} onError={setOauthError} className="auth-social-grid" />
          <div className="auth-divider" aria-hidden="true">
            <span />
            <small>atau daftar dengan email / WhatsApp</small>
            <span />
          </div>
          <MethodSwitch
            value={registerMethod}
            onChange={(val) => {
              if (val === "whatsapp") {
                const accountCenterUrl = process.env.NEXT_PUBLIC_ACCOUNT_CENTER_URL || "https://account.rabbaniinstitute.id";
                const cleanUrl = accountCenterUrl.replace(/\/$/, "");
                window.location.assign(`${cleanUrl}/auth/register?method=whatsapp&next=${encodeURIComponent(next)}`);
              } else {
                setRegisterMethod(val);
              }
            }}
            items={[
              { value: "email", label: "Daftar dengan email" },
              { value: "whatsapp", label: "Daftar dengan WhatsApp" },
            ]}
          />
          {registerMethod === "email" ? (
            <form className="form-panel auth-subform" action={signUp}>
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="preferredLanguage" value={preferredLanguage} />
              <label>
                Nama lengkap
                <input type="text" name="fullName" placeholder="Nama kamu" required />
              </label>
              <label>
                Email
                <input type="email" name="email" placeholder="nama@email.com" defaultValue={looksLikeEmail(identifier) ? identifier : ""} required />
              </label>
              <label>
                Tahun lahir
                <input type="number" name="birthYear" min="1900" max={new Date().getFullYear()} placeholder="Contoh: 1998" required />
                <span className="field-note">Dipakai untuk penyesuaian pengalaman belajar, bukan ditampilkan ke publik.</span>
              </label>
              <PasswordField
                label="Password"
                name="password"
                placeholder="Minimal 6 karakter"
                minLength={6}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
              />
              <PasswordField
                label="Konfirmasi password"
                name="confirmPassword"
                placeholder="Ulangi password"
                minLength={6}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
              />
              <p className="field-note">Gunakan minimal 6 karakter. Lebih aman jika memakai kombinasi huruf, angka, dan simbol.</p>
              <button className="button primary" type="submit">
                Daftar
              </button>
            </form>
          ) : (
            <form ref={registerWhatsappFormRef} className="form-panel auth-subform" onSubmit={handleWhatsappRegisterSubmit}>
              <input type="hidden" name="next" value={next} />
              <label>
                Nama lengkap
                <input type="text" name="fullName" placeholder="Nama kamu" required />
              </label>
              <label>
                Nomor WhatsApp
                <input type="tel" name="phoneNumber" placeholder="62812xxxxxxx" defaultValue={!looksLikeEmail(identifier) ? identifier : ""} required />
                <span className="field-note">Gunakan nomor aktif yang bisa menerima OTP WhatsApp.</span>
              </label>
              <label>
                Tahun lahir
                <input type="number" name="birthYear" min="1900" max={new Date().getFullYear()} placeholder="Contoh: 1998" required />
              </label>
              <PasswordField
                label="Password"
                name="password"
                placeholder="Minimal 6 karakter"
                minLength={6}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
              />
              <PasswordField
                label="Konfirmasi password"
                name="confirmPassword"
                placeholder="Ulangi password"
                minLength={6}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
              />
              {registerClientError ? <p className="notice error" role="alert">{registerClientError}</p> : null}
              {registerClientNotice ? <p className="notice success" role="status">{registerClientNotice}</p> : null}
              {registerOtpSent ? (
                <label>
                  Kode OTP
                  <input type="text" name="code" placeholder="Masukkan 6 digit OTP" maxLength={6} required />
                  <span className="field-note">Kode OTP dikirim ke {registerPhonePreview || "nomor WhatsApp kamu"}.</span>
                </label>
              ) : null}
              <div className="auth-inline-actions">
                <button className="button secondary" type="button" onClick={handleWhatsappRegisterOtpRequest} disabled={registerLoading}>
                  {registerLoading && !registerOtpSent ? "Mengirim OTP..." : registerOtpSent ? "Kirim ulang OTP" : "Kirim OTP"}
                </button>
                <button className="button primary" type="submit" disabled={!registerOtpSent || registerLoading}>
                  {registerLoading && registerOtpSent ? "Memverifikasi..." : "Verifikasi OTP dan buat akun"}
                </button>
              </div>
            </form>
          )}
          <p className="auth-support">
            Sudah punya akun? <Link href={`/auth?next=${encodeURIComponent(next)}`}>Masuk</Link>
          </p>
        </div>
      </div>
    );
  }

  if (mode === "forgot-password") {
    return (
      <div className="auth-single">
        <div ref={authPanelRef} id="auth-panel" className="panel form-panel auth-panel">
          <AuthSwitcher items={switcherItems} />
          <div className="auth-panel-header">
            <p className="section-label">Reset password</p>
            <h2>Lupa password</h2>
            <p className="auth-panel-copy">{panelCopy}</p>
          </div>
          {localizedError ? <p className="notice error" role="alert">{localizedError}</p> : null}
          {info ? <p className="notice info" role="status">{info}</p> : null}
          {message ? <SuccessNotice meta={successMeta} /> : null}
          <MethodSwitch
            value={forgotMethod}
            onChange={(val) => {
              if (val === "whatsapp") {
                const accountCenterUrl = process.env.NEXT_PUBLIC_ACCOUNT_CENTER_URL || "https://account.rabbaniinstitute.id";
                const cleanUrl = accountCenterUrl.replace(/\/$/, "");
                window.location.assign(`${cleanUrl}/auth/forgot-password?method=whatsapp&next=${encodeURIComponent(next)}`);
              } else {
                setForgotMethod(val);
              }
            }}
            items={[
              { value: "email", label: "Reset dengan email" },
              { value: "whatsapp", label: "Reset dengan WhatsApp" },
            ]}
          />
          {forgotMethod === "email" ? (
            <form className="form-panel auth-subform" action={requestPasswordReset}>
              <input type="hidden" name="next" value={next} />
              <label>
                Email
                <input type="email" name="identifier" placeholder="nama@email.com" defaultValue={looksLikeEmail(identifier) ? identifier : ""} required />
                <span className="field-note">Gunakan email yang sama dengan email akun Rabbani yang terdaftar.</span>
              </label>
              <button className="button primary" type="submit">
                Kirim tautan reset
              </button>
            </form>
          ) : (
            <form ref={resetWhatsappFormRef} className="form-panel auth-subform" onSubmit={handleWhatsappResetSubmit}>
              <label>
                Nomor WhatsApp
                <input type="tel" name="phoneNumber" placeholder="62812xxxxxxx" defaultValue={!looksLikeEmail(identifier) ? identifier : ""} required />
                <span className="field-note">Gunakan nomor WhatsApp yang sama dengan nomor saat akun didaftarkan.</span>
              </label>
              {resetClientError ? <p className="notice error" role="alert">{resetClientError}</p> : null}
              {resetClientNotice ? <p className="notice success" role="status">{resetClientNotice}</p> : null}
              {resetOtpSent ? (
                <>
                  <label>
                    Kode OTP
                    <input type="text" name="code" placeholder="Masukkan 6 digit OTP" maxLength={6} required />
                    <span className="field-note">Kode OTP dikirim ke {resetPhonePreview || "nomor WhatsApp kamu"}.</span>
                  </label>
                  <PasswordField
                    label="Password baru"
                    name="password"
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                    visible={showPassword}
                    onToggle={() => setShowPassword((current) => !current)}
                  />
                  <PasswordField
                    label="Konfirmasi password baru"
                    name="confirmPassword"
                    placeholder="Ulangi password baru"
                    minLength={6}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((current) => !current)}
                  />
                </>
              ) : null}
              <div className="auth-inline-actions">
                <button className="button secondary" type="button" onClick={handleWhatsappResetOtpRequest} disabled={resetLoading}>
                  {resetLoading && !resetOtpSent ? "Mengirim OTP..." : resetOtpSent ? "Kirim ulang OTP" : "Kirim OTP"}
                </button>
                <button className="button primary" type="submit" disabled={!resetOtpSent || resetLoading}>
                  {resetLoading && resetOtpSent ? "Memverifikasi..." : "Verifikasi OTP dan simpan password"}
                </button>
              </div>
            </form>
          )}
          <p className="auth-support">
            Ingat password? <Link href={`/auth?next=${encodeURIComponent(next)}`}>Kembali ke login</Link>
          </p>
        </div>
      </div>
    );
  }

  if (mode === "reset-password") {
    return (
      <div className="auth-single">
        <form ref={authPanelRef} id="auth-panel" className="panel form-panel auth-panel" action={updatePassword}>
          <AuthSwitcher items={switcherItems} />
          <div className="auth-panel-header">
            <p className="section-label">Reset password</p>
            <h2>Buat password baru</h2>
            <p className="auth-panel-copy">{panelCopy}</p>
          </div>
          {localizedError ? <p className="notice error" role="alert">{localizedError}</p> : null}
          {message ? <SuccessNotice meta={successMeta} /> : null}
          <input type="hidden" name="next" value={next} />
          <PasswordField
            label="Password baru"
            name="password"
            placeholder="Minimal 6 karakter"
            minLength={6}
            visible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
          />
          <PasswordField
            label="Konfirmasi password baru"
            name="confirmPassword"
            placeholder="Ulangi password baru"
            minLength={6}
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((current) => !current)}
          />
          <p className="field-note">Setelah disimpan, password baru ini akan dipakai untuk semua project Rabbani Institute.</p>
          <button className="button primary" type="submit">
            Simpan password baru
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-single">
      <form ref={authPanelRef} id="auth-panel" className="panel form-panel auth-panel" onSubmit={handleClientSignIn}>
        <AuthSwitcher items={switcherItems} />
        <div className="auth-panel-header">
          <p className="section-label">Login</p>
          <h2>Masuk ke akun belajar</h2>
          <p className="auth-panel-copy">{panelCopy}</p>
        </div>
        {localizedError ? <p className="notice error" role="alert">{localizedError}</p> : null}
        {loginClientError ? <p className="notice error" role="alert">{loginClientError}</p> : null}
        {oauthError ? <p className="notice error" role="alert">{oauthError}</p> : null}
        {message ? <SuccessNotice meta={successMeta} /> : null}
        <AuthSocialButtons next={next} onError={setOauthError} className="auth-social-grid" />
        <div className="auth-divider" aria-hidden="true">
          <span />
          <small>atau masuk dengan email / WhatsApp</small>
          <span />
        </div>
        <input type="hidden" name="next" value={next} />
        <label>
          Email atau nomor WhatsApp
          <input type="text" name="identifier" placeholder="nama@email.com atau 62812xxxxxxx" defaultValue={identifier} required />
        </label>
        <PasswordField
          label="Password"
          name="password"
          placeholder="Password"
          visible={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
        />
        <div className="auth-inline-links">
          <Link href={`/auth/forgot-password?identifier=${encodeURIComponent(identifier)}&method=${encodeURIComponent(looksLikeEmail(identifier) ? "email" : (identifier ? "whatsapp" : "email"))}&next=${encodeURIComponent(next)}`}>
            Lupa password?
          </Link>
          <Link href={`/auth/register?next=${encodeURIComponent(next)}`}>Buat akun baru</Link>
        </div>
        <button className="button primary" type="submit" disabled={loginLoading}>
          {loginLoading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}

function AuthSwitcher({ items }) {
  return (
    <div className="auth-switcher" aria-label="Navigasi autentikasi">
      {items.map((item) => (
      <Link
          key={item.href}
          href={`${item.href}#auth-panel`}
          className={item.active ? "auth-switcher-link is-active" : "auth-switcher-link"}
          aria-current={item.active ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function MethodSwitch({ value, onChange, items }) {
  return (
    <div className="auth-method-switch" role="tablist" aria-label="Metode autentikasi">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={item.value === value ? "auth-method-chip is-active" : "auth-method-chip"}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function PasswordField({ label, name, placeholder, minLength, visible, onToggle }) {
  return (
    <label>
      {label}
      <span className="password-field">
        <input
          type={visible ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          minLength={minLength}
          required
        />
        <button
          className="password-toggle"
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          title={visible ? "Sembunyikan password" : "Tampilkan password"}
        >
          {visible ? <EyeOff size={18} strokeWidth={2.2} /> : <Eye size={18} strokeWidth={2.2} />}
        </button>
      </span>
    </label>
  );
}

function SuccessNotice({ meta }) {
  return (
    <div className="notice success notice-stack" role="status">
      <strong>{meta.title}</strong>
      <p>{meta.body}</p>
      {meta.actions?.length ? (
        <div className="notice-actions">
          {meta.actions.map((action) => (
            <Link key={action.href} href={action.href} className={action.variant === "secondary" ? "button secondary small" : "button primary small"}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getSwitcherItems(mode, next) {
  return [
    {
      href: `/auth?next=${encodeURIComponent(next)}`,
      label: "Masuk",
      active: mode === "login",
    },
    {
      href: `/auth/register?next=${encodeURIComponent(next)}`,
      label: "Daftar",
      active: mode === "register",
    },
    {
      href: `/auth/forgot-password?next=${encodeURIComponent(next)}`,
      label: "Lupa password",
      active: mode === "forgot-password" || mode === "reset-password",
    },
  ];
}

function getPanelCopy(mode) {
  if (mode === "register") {
    return "Pilih metode pendaftaran yang paling nyaman. Kamu bisa membuat akun dengan email atau nomor WhatsApp aktif.";
  }

  if (mode === "forgot-password") {
    return "Reset password bisa lewat email atau WhatsApp, sesuai cara akunmu pertama kali didaftarkan.";
  }

  if (mode === "reset-password") {
    return "Simpan password baru yang mudah kamu ingat dan cukup kuat untuk dipakai sehari-hari.";
  }

  return "Masuk dengan email atau nomor WhatsApp untuk melanjutkan kelas, melihat progress, dan membuka studio belajarmu.";
}

function getSuccessMeta({ mode, message, identifier, next }) {
  if (mode === "forgot-password") {
    return {
      title: "Instruksi reset sudah dikirim",
      body: looksLikeEmail(identifier)
        ? `Silakan cek inbox ${identifier}. Jika belum terlihat, periksa folder spam atau promosi.`
        : message,
      actions: [
        {
          href: `/auth?next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(identifier || "")}`,
          label: "Kembali ke login",
          variant: "secondary",
        },
      ],
    };
  }

  if (mode === "reset-password") {
    return {
      title: "Password baru sudah tersimpan",
      body: "Sekarang kamu bisa masuk kembali dengan password yang baru.",
      actions: [
        {
          href: `/auth?next=${encodeURIComponent(next)}`,
          label: "Masuk sekarang",
          variant: "primary",
        },
      ],
    };
  }

  if (mode === "login" && /konfirmasi akun/i.test(message || "")) {
    return {
      title: "Akun hampir siap",
      body: looksLikeEmail(identifier)
        ? `Kami sudah meminta konfirmasi untuk ${identifier}. Buka email tersebut lalu klik tautan aktivasi.`
        : message,
      actions: [
        {
          href: `/auth/register?next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(identifier || "")}`,
          label: "Kembali ke daftar",
          variant: "secondary",
        },
      ],
    };
  }

  return {
    title: "Berhasil",
    body: message,
    actions: [],
  };
}
