import Link from "next/link";
import { redirect } from "next/navigation";
import StudioHeader from "@/components/admin/studio-header";
import StatusBadge from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAccountSummary } from "@/lib/account-center";
import { formatDateTime, formatIdr } from "@/lib/data";
import { platformUrls } from "@/lib/platform-urls";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountPaymentsPage() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const summary = await getAccountSummary(user, profile);

  return (
    <>
      <StudioHeader title="Pembayaran" rootHref="/profile" rootLabel="Akun" />
      <main className="flex flex-col gap-6 p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">PEMBAYARAN</p>
          <h1 className="text-3xl font-bold tracking-tight">Pembayaran</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan pembayaran yang sudah tercatat di app Rabbani yang Anda gunakan.
          </p>
        </div>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b pb-3">
            <h2 className="text-sm font-semibold">Riwayat pembayaran</h2>
          </CardHeader>
          <CardContent className="p-0">
            {summary.payments.length === 0 ? (
              <div className="flex flex-col gap-3 p-6 text-sm text-muted-foreground">
                <p>Belum ada pembayaran yang tercatat.</p>
                <Link
                  className="inline-flex h-9 w-fit items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted/50"
                  href={platformUrls.classesHome}
                >
                  Lihat kelas
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.payments.map((item) => (
                    <TableRow key={item.order_id}>
                      <TableCell className="text-sm">Campus</TableCell>
                      <TableCell className="font-mono text-xs">{item.order_id}</TableCell>
                      <TableCell className="text-sm">{item.course?.title_id || "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.transaction_status || "unknown"} />
                      </TableCell>
                      <TableCell className="text-sm">{formatIdr(item.amount_idr)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(item.paid_at || item.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
