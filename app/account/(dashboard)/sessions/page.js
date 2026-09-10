import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import StudioHeader from "@/components/admin/studio-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/data";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AccountSessionsPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const currentSessionCookies = cookieStore.getAll().filter((item) => item.name.startsWith("sb-"));
  const userAgent = headerStore.get("user-agent") || "Peramban tidak diketahui";

  return (
    <>
      <StudioHeader title="Sesi aktif" rootHref="/profile" rootLabel="Akun" />
      <main className="flex flex-col gap-6 p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SESI</p>
          <h1 className="text-3xl font-bold tracking-tight">Sesi aktif</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan sesi yang sedang aktif di perangkat ini. Untuk sinkronisasi lintas perangkat, account center memakai sesi Supabase yang sama.
          </p>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b pb-3">
            <h2 className="text-sm font-semibold">Perangkat ini</h2>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4">
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <p className="text-sm font-semibold">Login terakhir</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(user?.last_sign_in_at || user?.updated_at || user?.created_at)}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <p className="text-sm font-semibold">User agent</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">{userAgent}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <p className="text-sm font-semibold">Cookie session terdeteksi</p>
              <p className="mt-1 text-sm text-muted-foreground">{currentSessionCookies.length} cookie Supabase aktif pada origin ini.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
