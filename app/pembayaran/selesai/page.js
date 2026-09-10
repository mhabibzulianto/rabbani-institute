import Link from "next/link";
import { syncMidtransTransactionStatus } from "@/lib/payments";
import { formatIdr } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PembayaranSelesaiPage({ searchParams }) {
  const params = await searchParams;
  const orderId = params?.order_id || params?.orderId || "";
  const courseSlug = params?.course || "";

  let syncResult = null;
  let errorMsg = null;

  if (orderId) {
    try {
      syncResult = await syncMidtransTransactionStatus({
        orderId,
        asAdmin: true, // asAdmin true agar aman jika sesi cookie belum ter-load di subdomain redirect
      });
    } catch (err) {
      console.error("Gagal melakukan sync pembayaran di redirect page:", err);
      errorMsg = err.message || "Gagal memperbarui status pembayaran.";
    }
  } else {
    errorMsg = "Order ID tidak ditemukan.";
  }

  const txStatus = syncResult?.statusPayload?.transaction_status || "pending";
  const grossAmount = Number(syncResult?.statusPayload?.gross_amount || 0);
  const courseTitle = syncResult?.course?.title_id || "Kelas Rabbani Institute";

  const isSuccess = ["settlement", "capture"].includes(txStatus);
  const isFailed = ["deny", "cancel", "expire", "failure"].includes(txStatus);
  const isPending = ["pending", "authorize"].includes(txStatus) || txStatus === "unknown";

  return (
    <div className="min-h-screen bg-[#f8f6f0] text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-border/80 shadow-md p-8 text-center space-y-6">
        
        {/* ICON & HEADER STATUS */}
        {isSuccess && (
          <div className="space-y-3">
            <div className="mx-auto size-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600">
              <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-emerald-800">Pembayaran Berhasil!</h1>
            <p className="text-sm text-muted-foreground">
              Jazakumullahu khairan. Pembayaran Anda sudah kami terima dan kelas Anda telah aktif.
            </p>
          </div>
        )}

        {isFailed && (
          <div className="space-y-3">
            <div className="mx-auto size-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-600">
              <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-rose-800">Pembayaran Gagal</h1>
            <p className="text-sm text-muted-foreground">
              Transaksi dibatalkan, ditolak, atau waktu pembayaran telah habis.
            </p>
          </div>
        )}

        {isPending && (
          <div className="space-y-3">
            <div className="mx-auto size-16 bg-sky-50 border border-sky-200 rounded-full flex items-center justify-center text-sky-600 animate-pulse">
              <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-sky-850">Pembayaran Tertunda (Pending)</h1>
            <p className="text-sm text-muted-foreground">
              Kami masih menunggu konfirmasi transfer dari e-wallet/bank Anda.
            </p>
          </div>
        )}

        {/* DETAIL TRANSAKSI */}
        {syncResult && (
          <div className="rounded-xl border border-border bg-[#faf9f6]/50 p-5 text-left text-sm space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Nomor Order</span>
              <span className="font-mono font-semibold">{orderId}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Materi Kelas</span>
              <span className="font-semibold text-right max-w-[200px] truncate">{courseTitle}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Total Bayar</span>
              <span className="font-semibold text-foreground">{formatIdr(grossAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status Midtrans</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                isSuccess ? "bg-emerald-100 text-emerald-800" : isFailed ? "bg-rose-100 text-rose-800" : "bg-sky-100 text-sky-850"
              }`}>
                {txStatus}
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
            {errorMsg}
          </div>
        )}

        {/* TOMBOL AKSI */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          {isSuccess && courseSlug && (
            <Link
              href={`/learn/${courseSlug}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition active:scale-95"
            >
              Mulai Belajar Sekarang
            </Link>
          )}

          {isFailed && courseSlug && (
            <Link
              href={`/courses/${courseSlug}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition active:scale-95"
            >
              Coba Checkout Ulang
            </Link>
          )}

          <Link
            href="/payments"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground hover:bg-muted/50 transition active:scale-95"
          >
            Lihat Riwayat Pembayaran
          </Link>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          Butuh bantuan? Hubungi Admin Rabbani Institute melalui WhatsApp.
        </p>
      </div>
    </div>
  );
}
