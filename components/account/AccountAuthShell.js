import { signIn } from "@/app/actions";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import AuthSocialButtons from "@/components/AuthSocialButtons";

export default function AccountAuthShell({ next = "/profile" }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(67,97,238,0.12),_transparent_35%),linear-gradient(180deg,_#f7f8fc,_#eef3fb)] px-4 py-10 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur">
            <ShieldCheck className="size-4 text-primary" />
            Account Center
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Mudah mengelola studi dan perangkat belajarmu.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Masuk untuk mengakses pusat akunmu.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur">
              <strong className="block text-foreground">Identitas tetap tunggal</strong>
              Profil dan pengaturan keamanan tetap berada di satu tempat.
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur">
              <strong className="block text-foreground">Aktivasi app bersifat lazy</strong>
              Akun untuk campus, store, atau osban baru tercatat saat app itu benar-benar dipakai.
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/70 bg-background/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="space-y-2 text-center">
            <h2 className="text-[2.1rem] font-medium tracking-tight text-foreground sm:text-[2.35rem]">
              Selamat datang kembali
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Masuk dengan email atau nomor WhatsApp
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <form action={signIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="account-identifier">Email atau nomor WhatsApp</label>
                <input
                  id="account-identifier"
                  name="identifier"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="user@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="account-password">Password</label>
                <input
                  id="account-password"
                  type="password"
                  name="password"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter password"
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-foreground">
                  <input type="checkbox" name="remember" className="size-4 rounded border-border" />
                  Ingat saya
                </label>
                <Link className="font-medium text-primary hover:underline" href={`/auth/forgot-password?next=${encodeURIComponent(next)}`}>
                  Lupa password?
                </Link>
              </div>
              <input type="hidden" name="next" value={next} />
              <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95" type="submit">
                Log In
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>OR LOGIN WITH</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <AuthSocialButtons next={next} />

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t Have An Account?{" "}
              <Link className="font-medium text-primary hover:underline" href={`/auth/register?next=${encodeURIComponent(next)}`}>
                Register Now.
              </Link>
            </div>

            <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href="/">
              Kembali ke situs utama
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
