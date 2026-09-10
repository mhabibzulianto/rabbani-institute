import Link from "next/link";
import { redirect } from "next/navigation";
import PaymentSyncForm from "@/components/payments/PaymentSyncForm";
import {
  finalizePaidEnrollment,
  isMidtransPaymentFailed,
  isMidtransPaymentPending,
  isMidtransPaymentSuccessful,
} from "@/lib/payments";
import { formatIdr } from "@/lib/data";
import { getCurrentUser } from "@/lib/supabase/server";

const modeCopy = {
  finish: {
    missingTitle: "Order pembayaran tidak ditemukan",
    missingDescription: "Link kembali dari Midtrans belum membawa order ID yang bisa diverifikasi.",
    errorTitle: "Checkout belum bisa diselesaikan",
    fallbackTitle: "Pembayaran belum berhasil",
    fallbackDescription: "Cek metode pembayaran yang dipilih atau ulangi checkout dari halaman kelas.",
    label: "Pembayaran Midtrans",
  },
  unfinish: {
    missingTitle: "Pembayaran belum diselesaikan",
    missingDescription: "Kamu keluar dari halaman Midtrans sebelum pembayaran selesai diverifikasi.",
    errorTitle: "Pembayaran belum selesai",
    fallbackTitle: "Pembayaran belum selesai",
    fallbackDescription: "Lanjutkan pembayaran dari metode yang tadi dipilih atau ulangi checkout dari halaman kelas.",
    label: "Pembayaran Midtrans",
  },
  error: {
    missingTitle: "Pembayaran tidak dapat diproses",
    missingDescription: "Midtrans mengembalikan pengguna ke halaman error tanpa order ID yang bisa diverifikasi.",
    errorTitle: "Pembayaran gagal diproses",
    fallbackTitle: "Pembayaran belum berhasil",
    fallbackDescription: "Terjadi kendala saat pembayaran. Coba ulangi checkout atau pilih metode pembayaran lain.",
    label: "Pembayaran Midtrans",
  },
};

export default async function PaymentReturnPage({ searchParams, mode = "finish" }) {
  const copy = modeCopy[mode] || modeCopy.finish;
  const query = await searchParams;
  const orderId = query?.order_id?.toString() || "";
  const courseSlug = query?.course?.toString() || "";
  const { user } = await getCurrentUser();

  if (!user) {
    const nextPath = `/payments/${mode}${orderId ? `?order_id=${encodeURIComponent(orderId)}${courseSlug ? `&course=${encodeURIComponent(courseSlug)}` : ""}` : ""}`;
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }

  if (!orderId) {
    return (
      <main className="page">
        <section className="panel payment-status-card">
          <p className="section-label">{copy.label}</p>
          <h1>{copy.missingTitle}</h1>
          <p>{copy.missingDescription}</p>
          <Link className="button primary" href={courseSlug ? `/courses/${courseSlug}` : "/courses"}>
            Kembali ke katalog
          </Link>
        </section>
      </main>
    );
  }

  let result;
  let caughtError = null;

  try {
    result = await finalizePaidEnrollment({
      orderId,
      userId: user.id,
    });
  } catch (error) {
    caughtError = error;
  }

  if (caughtError) {
    return (
      <main className="page">
        <section className="panel payment-status-card">
          <p className="section-label">{copy.label}</p>
          <h1>{copy.errorTitle}</h1>
          <p>{caughtError.message || copy.fallbackDescription}</p>
          <div className="hero-actions">
            <Link className="button secondary" href={courseSlug ? `/courses/${courseSlug}` : "/courses"}>
              Kembali ke halaman kelas
            </Link>
            <Link className="button ghost" href="/payments">
              Riwayat pembayaran
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const status = result?.statusPayload?.transaction_status || "pending";
  const isSuccess = isMidtransPaymentSuccessful(status, result?.statusPayload?.fraud_status);
  const isPending = isMidtransPaymentPending(status);
  const isFailed = isMidtransPaymentFailed(status);

  const title = isSuccess
    ? "Pembayaran berhasil"
    : isPending
      ? "Pembayaran masih diproses"
      : copy.fallbackTitle;
  const description = isSuccess
    ? "Akses kelas sudah diaktifkan. Kamu bisa langsung mulai belajar."
    : isPending
      ? "Midtrans masih menunggu penyelesaian pembayaran. Setelah status berubah sukses, akses kelas akan aktif tanpa konfirmasi manual."
      : copy.fallbackDescription;
  const resolvedCourseSlug = result?.course?.slug || courseSlug;
  const returnPath = `/payments/${mode}?order_id=${encodeURIComponent(orderId)}${resolvedCourseSlug ? `&course=${encodeURIComponent(resolvedCourseSlug)}` : ""}`;

  return (
    <main className="page">
      <section className="panel payment-status-card">
        <p className="section-label">{copy.label}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="notice info">
          Sistem akan membaca status langsung dari Midtrans. Kamu tidak perlu mengirim konfirmasi pembayaran manual.
        </div>
        <div className="payment-meta-grid">
          <div>
            <span className="section-label">Order</span>
            <strong>{orderId}</strong>
          </div>
          <div>
            <span className="section-label">Status</span>
            <strong>{status}</strong>
          </div>
          <div>
            <span className="section-label">Metode</span>
            <strong>{result?.statusPayload?.payment_type || "-"}</strong>
          </div>
          <div>
            <span className="section-label">Nominal</span>
            <strong>{formatIdr(result?.statusPayload?.gross_amount || 0)}</strong>
          </div>
        </div>
        <div className="hero-actions">
          {isSuccess && resolvedCourseSlug ? (
            <Link className="button primary" href={`/learn/${resolvedCourseSlug}`}>
              Buka kelas
            </Link>
          ) : null}
          {!isSuccess ? (
            <PaymentSyncForm
              className={isPending ? "button primary" : "button secondary"}
              courseSlug={resolvedCourseSlug}
              label={isPending ? "Cek status terbaru" : isFailed ? "Coba sinkronkan lagi" : "Sinkronkan status"}
              orderId={orderId}
              returnPath={returnPath}
            />
          ) : null}
          {resolvedCourseSlug ? (
            <Link className="button secondary" href={`/courses/${resolvedCourseSlug}`}>
              Kembali ke halaman kelas
            </Link>
          ) : (
            <Link className="button secondary" href="/courses">
              Kembali ke katalog
            </Link>
          )}
          <Link className="button ghost" href="/payments">
            Riwayat pembayaran
          </Link>
        </div>
      </section>
    </main>
  );
}
