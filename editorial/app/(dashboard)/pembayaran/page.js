import PageHeader from "@/components/PageHeader";
import { formatDateTime, formatIdr, getStudentPayments } from "@/lib/madrasah";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function PembayaranPage() {
  const { user } = await getCurrentUser();
  const payments = await getStudentPayments(user.id);

  return (
    <main className="page-shell">
      <PageHeader
        title="Pembayaran"
        description="Riwayat pembayaran kelas Anda yang sudah ada di Studio ditampilkan kembali di Madrasah."
      />

      <section className="panel-card">
        {payments.length === 0 ? (
          <p className="empty-copy">Belum ada transaksi yang tersimpan untuk akun ini.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Kelas</th>
                  <th>Status</th>
                  <th>Metode</th>
                  <th>Nominal</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((item) => (
                  <tr key={item.order_id}>
                    <td>{item.order_id}</td>
                    <td>{item.course?.title_id || "-"}</td>
                    <td><span className={`status-pill status-${item.transaction_status || "unknown"}`}>{item.transaction_status || "-"}</span></td>
                    <td>{item.payment_type || "-"}</td>
                    <td>{formatIdr(item.amount_idr)}</td>
                    <td>{formatDateTime(item.paid_at || item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
