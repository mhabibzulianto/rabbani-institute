import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CheckCircle2, CircleDashed } from "lucide-react";
import StudioHeader from "@/components/admin/studio-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAccountSummary } from "@/lib/account-center";
import { formatDateTime } from "@/lib/data";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AccountAppsPage() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const summary = await getAccountSummary(user, profile);

  return (
    <>
      <StudioHeader title="Kelola akun" rootHref="/profile" rootLabel="Akun" />
      <main className="flex flex-col gap-6 p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">APP ACCESS</p>
          <h1 className="text-3xl font-bold tracking-tight">Kelola akun</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Account center hanya menampilkan app yang memang sudah Anda pakai. Tidak ada akun yang dibuat otomatis untuk app yang belum pernah Anda buka.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summary.memberships.map((app) => (
            <Card key={app.slug} className="border-border/70 shadow-sm">
              <CardHeader className="border-b pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">{app.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{app.description}</p>
                  </div>
                  {app.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      <CircleDashed className="size-3.5" />
                      Belum aktif
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                <div className="text-sm text-muted-foreground">
                  <p>Aktivasi pertama: {app.activatedAt ? formatDateTime(app.activatedAt) : "Belum ada"}</p>
                  <p>Kunjungan terakhir: {app.lastSeenAt ? formatDateTime(app.lastSeenAt) : "Belum tercatat"}</p>
                </div>
                <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-muted/50" href={app.href}>
                  Buka {app.title}
                  <ArrowUpRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </>
  );
}
