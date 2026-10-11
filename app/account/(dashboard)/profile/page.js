import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Mail, MessageCircle, UserRound } from "lucide-react";
import StudioHeader from "@/components/admin/studio-header";
import StatCard from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAccountSummary } from "@/lib/account-center";
import { normalizeLanguage } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/supabase/server";
import { updateAccountProfile } from "@/app/account/actions";

function ReadOnlyField({ icon: Icon, label, value }) {
  return (
    <div className="grid gap-1 rounded-lg border border-border/70 bg-background p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
  );
}

export default async function AccountProfilePage({ searchParams }) {
  const params = await searchParams;
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const language = normalizeLanguage(profile?.preferred_language || cookieStore.get("rabbani-language")?.value);
  const summary = await getAccountSummary(user, profile);

  return (
    <>
      <StudioHeader title="Profil" rootHref="/profile" rootLabel="Akun" searchPlaceholder="Cari di account center..." />
      <main className="flex flex-col gap-6 p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ACCOUNT CENTER</p>
          <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola identitas utama yang dipakai bersama oleh campus, store, dan app Rabbani lainnya.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard value={summary.stats.activeApps} label="App aktif" />
          <StatCard value={summary.stats.enrollments} label="Enrollment campus" />
          <StatCard value={summary.stats.payments} label="Pembayaran" />
          <StatCard value={summary.stats.addresses} label="Alamat" />
        </section>

        {params?.message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{params.message}</p> : null}
        {params?.error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p> : null}

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b pb-3">
              <h2 className="text-sm font-semibold">Informasi utama</h2>
            </CardHeader>
            <CardContent className="pt-4">
              <form action={updateAccountProfile} className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium">
                  Nama lengkap
                  <input name="full_name" defaultValue={profile?.full_name || ""} className="h-11 rounded-lg border border-input bg-background px-3" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">
                    Bahasa utama
                    <select name="preferred_language" defaultValue={language} className="h-11 rounded-lg border border-input bg-background px-3">
                      <option value="id">Indonesia</option>
                      <option value="ar">Arab</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Tahun lahir
                    <input name="birth_year" defaultValue={profile?.birth_year || ""} className="h-11 rounded-lg border border-input bg-background px-3" />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium">
                  Bio singkat
                  <textarea
                    name="bio"
                    defaultValue={profile?.bio || ""}
                    rows={5}
                    className="min-h-32 rounded-lg border border-input bg-background px-3 py-3"
                    placeholder="Tuliskan bio singkat yang ingin dipakai lintas app."
                  />
                </label>
                <button className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">
                  Simpan profil
                </button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="border-b pb-3">
                <h2 className="text-sm font-semibold">Identitas akun</h2>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4">
                <ReadOnlyField icon={Mail} label="Email" value={user?.email} />
                <ReadOnlyField icon={MessageCircle} label="WhatsApp" value={profile?.phone_number || "-"} />
                <ReadOnlyField icon={UserRound} label="Peran utama" value={summary.roleLabel} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}
