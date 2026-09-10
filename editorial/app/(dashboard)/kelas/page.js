import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { formatDate, getUserClasses } from "@/lib/madrasah";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function KelasPage() {
  const { user, profile } = await getCurrentUser();
  const classes = await getUserClasses(user.id);
  const isInstructor = profile?.role === "instructor";

  return (
    <main className="page-shell">
      <PageHeader
        badge={isInstructor ? "INSTRUKTUR" : "KELAS"}
        title="Kelas"
        description={isInstructor ? "Daftar kelas yang sedang Anda ajar." : "Daftar kelas yang sedang Anda ikuti."}
      />

      <section className="panel-card">
        {classes.length === 0 ? (
          <p className="empty-copy">
            {isInstructor ? "Belum ada kelas yang sedang diajar." : "Belum ada kelas aktif untuk akun ini."}
          </p>
        ) : (
          <div className="stack-list">
            {classes.map((item) => (
              <Link className="list-card" href={`/kelas/${item.course?.slug}`} key={item.id}>
                <div>
                  <strong>{item.course?.title_id || "Kelas"}</strong>
                  <p>Status: {item.status || "-"}</p>
                </div>
                <span>{formatDate(item.enrolled_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
