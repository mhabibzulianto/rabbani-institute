import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import StudioHeader from "@/components/admin/studio-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAccountAddresses } from "@/lib/account-center";
import { getCurrentUser } from "@/lib/supabase/server";
import { deleteAccountAddress, saveAccountAddress } from "@/app/account/actions";

export default async function AccountAddressesPage({ searchParams }) {
  const params = await searchParams;
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const addresses = await getAccountAddresses(user.id);

  return (
    <>
      <StudioHeader title="Alamat" rootHref="/profile" rootLabel="Akun" />
      <main className="flex flex-col gap-6 p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ALAMAT</p>
          <h1 className="text-3xl font-bold tracking-tight">Alamat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simpan alamat yang nanti bisa dipakai kembali saat store Rabbani mulai digunakan.
          </p>
        </div>

        {params?.message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{params.message}</p> : null}
        {params?.error ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{params.error}</p> : null}

        <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b pb-3">
              <h2 className="text-sm font-semibold">Alamat tersimpan</h2>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              {addresses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-background p-5 text-sm text-muted-foreground">
                  Belum ada alamat. Anda bisa menambahkan alamat pertama dari form di samping.
                </div>
              ) : addresses.map((address) => (
                <div key={address.id} className="rounded-lg border border-border/70 bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{address.label || "Alamat"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{address.recipient_name || "-"}</p>
                    </div>
                    {address.is_primary ? (
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">Utama</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-foreground">
                    {[address.address_line1, address.address_line2, address.city, address.province, address.postal_code, address.country_code].filter(Boolean).join(", ") || "-"}
                  </p>
                  <div className="mt-4">
                    <form action={deleteAccountAddress}>
                      <input type="hidden" name="address_id" value={address.id} />
                      <button className="text-sm font-medium text-rose-600 hover:underline" type="submit">Hapus alamat</button>
                    </form>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="border-b pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Plus className="size-4" />
                Tambah alamat
              </h2>
            </CardHeader>
            <CardContent className="pt-4">
              <form action={saveAccountAddress} className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium">
                  Label
                  <input name="label" className="h-11 rounded-lg border border-input bg-background px-3" placeholder="Rumah, Kantor, atau Asrama" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Nama penerima
                  <input name="recipient_name" className="h-11 rounded-lg border border-input bg-background px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Nomor WhatsApp
                  <input name="phone_number" className="h-11 rounded-lg border border-input bg-background px-3" placeholder="62812xxxxxxx" />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Alamat utama
                  <textarea name="address_line1" rows={4} className="rounded-lg border border-input bg-background px-3 py-3" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">
                    Kota
                    <input name="city" className="h-11 rounded-lg border border-input bg-background px-3" />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Provinsi
                    <input name="province" className="h-11 rounded-lg border border-input bg-background px-3" />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">
                    Kode pos
                    <input name="postal_code" className="h-11 rounded-lg border border-input bg-background px-3" />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Kode negara
                    <input name="country_code" defaultValue="ID" className="h-11 rounded-lg border border-input bg-background px-3" />
                  </label>
                </div>
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input type="checkbox" name="is_primary" className="size-4 rounded border-border" />
                  Jadikan alamat utama
                </label>
                <button className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground" type="submit">
                  Simpan alamat
                </button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
