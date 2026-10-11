import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import StudioHeader from "@/components/admin/studio-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";

function providerLabel(identity) {
  if (!identity) return "Email";
  if (identity.provider === "google") return "Google";
  if (identity.provider === "apple") return "Apple";
  if (identity.provider === "email") return "Email";
  return identity.provider;
}

export default async function AccountSecurityPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const identities = user?.identities || [];

  return (
    <>
      <StudioHeader title="Kata sandi dan keamanan" rootHref="/profile" rootLabel="Akun" />
      <main className="flex flex-col gap-6 p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">KEAMANAN</p>
          <h1 className="text-3xl font-bold tracking-tight">Kata sandi dan keamanan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola metode masuk, reset password, dan kebiasaan keamanan untuk seluruh ekosistem Rabbani.
          </p>
        </div>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b pb-3">
              <h2 className="text-sm font-semibold">Metode masuk</h2>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              {(identities.length ? identities : [{ provider: "email" }]).map((identity, index) => (
                <div key={`${identity.provider}-${index}`} className="rounded-lg border border-border/70 bg-background p-4">
                  <p className="text-sm font-semibold">{providerLabel(identity)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {identity.identity_data?.email || user?.email || "Login utama Rabbani"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b pb-3">
              <h2 className="text-sm font-semibold">Aksi keamanan</h2>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              <Link className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-4 py-3 text-sm font-medium hover:bg-muted/50" href="/auth/forgot-password?next=%2Fsecurity">
                <KeyRound className="size-4" />
                Reset password
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-4 py-3 text-sm font-medium hover:bg-muted/50" href="/account/sessions">
                <Smartphone className="size-4" />
                Lihat sesi aktif
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-4 py-3 text-sm font-medium hover:bg-muted/50" href="/auth/logout">
                <ShieldCheck className="size-4" />
                Keluar dari perangkat ini
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
