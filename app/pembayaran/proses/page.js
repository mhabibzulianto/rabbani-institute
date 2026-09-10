"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ProsesPembayaranContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get("courseId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [deviceType, setDeviceType] = useState("desktop"); // desktop or mobile

  useEffect(() => {
    if (!courseId) {
      setError("Course ID tidak valid atau tidak ditemukan.");
      setLoading(false);
      return;
    }

    // Deteksi device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setDeviceType(isMobileDevice ? "mobile" : "desktop");

    // Lakukan charge transaksi GoPay
    const initiatePayment = async () => {
      try {
        const response = await fetch("/api/payments/gopay", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ courseId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Gagal menyiapkan pembayaran.");
        }

        setPaymentData(data);
        setLoading(false);

        // Jika mobile, langsung trigger redirect deeplink ke aplikasi GoPay
        if (isMobileDevice && data.deeplinkUrl) {
          window.location.href = data.deeplinkUrl;
        }
      } catch (err) {
        console.error("Initiate payment error:", err);
        setError(err.message || "Terjadi kesalahan koneksi.");
        setLoading(false);
      }
    };

    initiatePayment();
  }, [courseId]);

  // Polling status pembayaran
  useEffect(() => {
    if (!paymentData?.orderId) return;

    let intervalId = null;

    const checkStatus = async () => {
      try {
        // Gunakan sync status dari backend API status jika ada, atau buat sync request
        const response = await fetch(`/api/payments/gopay/status?orderId=${encodeURIComponent(paymentData.orderId)}`);
        if (!response.ok) return;

        const data = await response.json();
        if (["settlement", "capture"].includes(data.status)) {
          clearInterval(intervalId);
          router.push(`/pembayaran/selesai?order_id=${encodeURIComponent(paymentData.orderId)}&course=${encodeURIComponent(paymentData.courseSlug)}`);
        }
      } catch (err) {
        console.error("Status check error:", err);
      }
    };

    intervalId = setInterval(checkStatus, 5000);
    return () => clearInterval(intervalId);
  }, [paymentData, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Menghubungkan dengan sistem pembayaran Midtrans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <div className="mx-auto size-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600">
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-rose-950">Gagal Menyiapkan Pembayaran</h2>
        <p className="text-sm text-rose-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full h-10 inline-flex items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition active:scale-95 cursor-pointer"
        >
          Coba Ulangi
        </button>
      </div>
    );
  }

  const { qrCodeUrl, deeplinkUrl, amount, courseSlug } = paymentData;

  return (
    <div className="w-full max-w-md bg-white border border-border/80 rounded-2xl p-6 shadow-md space-y-6">
      <div className="border-b pb-4 text-center">
        <h1 className="text-lg font-bold text-foreground">Pembayaran GoPay / QRIS</h1>
        <p className="text-xs text-muted-foreground mt-1">Selesaikan pembayaran tagihan Anda di bawah ini</p>
      </div>

      <div className="text-center py-2 bg-[#faf9f6] rounded-xl border border-border/60">
        <span className="text-xs text-muted-foreground font-medium">Total Tagihan</span>
        <p className="text-2xl font-black text-primary mt-0.5">
          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)}
        </p>
      </div>

      {/* JIKA DESKTOP: RENDER QR CODE IMAGE */}
      {deviceType === "desktop" && qrCodeUrl ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-3 rounded-xl border border-border/50 shadow-sm max-w-[240px]">
            <img src={qrCodeUrl} alt="QRIS Code" className="w-full h-auto aspect-square object-contain" />
          </div>
          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Pindai QR Code di atas menggunakan aplikasi <strong>Gojek, GoPay, OVO, DANA, LinkAja, atau Mobile Banking</strong> Anda untuk membayar.
          </p>
        </div>
      ) : null}

      {/* JIKA MOBILE: TAMPILKAN TOMBOL DEEPLINK REDIRECT */}
      {deviceType === "mobile" && deeplinkUrl ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 text-center">
            <p className="text-xs text-sky-800 leading-relaxed">
              Sistem telah mendeteksi perangkat mobile. Mengeklik tombol di bawah akan otomatis membuka aplikasi <strong>Gojek / GoPay</strong> di ponsel Anda.
            </p>
          </div>
          <a
            href={deeplinkUrl}
            className="w-full h-12 inline-flex items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm hover:bg-primary/95 transition active:scale-95 text-center"
          >
            Buka Aplikasi GoPay
          </a>
        </div>
      ) : null}

      {/* ALTERNATIF MANUAL JIKA REDIRECT GAGAL / WEBVIEW */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider font-semibold">Petunjuk Alternatif</p>
        <ol className="list-decimal pl-4 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          {deviceType === "mobile" && qrCodeUrl && (
            <li>
              Jika aplikasi GoPay tidak terbuka otomatis, simpan tangkapan layar (screenshot) QR Code ini, lalu unggah di menu scan aplikasi pembayaran Anda.
              <div className="mt-3 flex justify-center">
                <div className="bg-white p-2 rounded-lg border border-border/50 max-w-[150px]">
                  <img src={qrCodeUrl} alt="Alternative QRIS" className="w-full h-auto" />
                </div>
              </div>
            </li>
          )}
          <li>Halaman ini akan otomatis dialihkan ke layar sukses setelah pembayaran Anda terverifikasi oleh sistem.</li>
        </ol>
      </div>
    </div>
  );
}

export default function ProsesPembayaranPage() {
  return (
    <div className="min-h-screen bg-[#f8f6f0] text-foreground flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Memuat pemroses pembayaran...</p>
        </div>
      }>
        <ProsesPembayaranContent />
      </Suspense>
    </div>
  );
}
