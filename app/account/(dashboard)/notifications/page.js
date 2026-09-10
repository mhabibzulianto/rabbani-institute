import { redirect } from "next/navigation";
import StudioHeader from "@/components/admin/studio-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAccountSummary } from "@/lib/account-center";
import { getCurrentUser } from "@/lib/supabase/server";
import { saveNotificationPreferences } from "@/app/account/actions";

function PreferenceCheckbox({ defaultChecked, description, label, name }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-background p-4">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 rounded border-border" />
      <span className="grid gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

export default async function AccountNotificationsPage({ searchParams }) {
  const params = await searchParams;
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const summary = await getAccountSummary(user, profile);
  const prefs = summary.notifications;

  return (
    <>
      <StudioHeader title="Notifikasi" rootHref="/profile" rootLabel="Akun" />
      <main className="flex flex-col gap-6 p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">NOTIFIKASI</p>
          <h1 className="text-3xl font-bold tracking-tight">Notifikasi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur notifikasi email dan WhatsApp untuk keamanan, pembayaran, dan aktivitas belajar.
          </p>
        </div>

        {params?.message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{params.message}</p> : null}
        {params?.error ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{params.error}</p> : null}

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b pb-3">
            <h2 className="text-sm font-semibold">Preferensi</h2>
          </CardHeader>
          <CardContent className="pt-4">
            <form action={saveNotificationPreferences} className="grid gap-4">
              <PreferenceCheckbox
                name="email_learning_updates"
                label="Email pembelajaran"
                description="Pengingat kelas, update artikel, dan progres belajar."
                defaultChecked={prefs.email_learning_updates}
              />
              <PreferenceCheckbox
                name="email_payment_updates"
                label="Email pembayaran"
                description="Status checkout, pembayaran sukses, dan invoice."
                defaultChecked={prefs.email_payment_updates}
              />
              <PreferenceCheckbox
                name="email_security_alerts"
                label="Email keamanan"
                description="Konfirmasi login, reset password, dan peringatan keamanan."
                defaultChecked={prefs.email_security_alerts}
              />
              <PreferenceCheckbox
                name="whatsapp_learning_updates"
                label="WhatsApp pembelajaran"
                description="Pengingat kelas dan informasi akademik yang penting."
                defaultChecked={prefs.whatsapp_learning_updates}
              />
              <PreferenceCheckbox
                name="whatsapp_payment_updates"
                label="WhatsApp pembayaran"
                description="Pemberitahuan saat pembayaran tertunda atau berhasil."
                defaultChecked={prefs.whatsapp_payment_updates}
              />
              <PreferenceCheckbox
                name="whatsapp_security_alerts"
                label="WhatsApp keamanan"
                description="OTP dan pemberitahuan keamanan yang membutuhkan respons cepat."
                defaultChecked={prefs.whatsapp_security_alerts}
              />
              <button className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">
                Simpan preferensi
              </button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
