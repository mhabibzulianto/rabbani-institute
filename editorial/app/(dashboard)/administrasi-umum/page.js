import PageHeader from "@/components/PageHeader";
import { updateOfficialProfile } from "@/app/actions";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AdministrasiUmumPage({ searchParams }) {
  const params = await searchParams;
  const { profile } = await getCurrentUser();
  const certificateLocked = Boolean(profile?.certificate_name_changed_at);

  return (
    <main className="page-shell">
      <PageHeader
        title="Administrasi umum"
        description="Profil siswa untuk administrasi resmi. Data ini disimpan di Supabase yang sama dan ikut terbaca oleh Account Center."
      />

      {params?.message ? <p className="notice success">{params.message}</p> : null}
      {params?.error ? <p className="notice error">{params.error}</p> : null}

      <section className="panel-card">
        <form action={updateOfficialProfile} className="form-grid">
          <label>
            <span>Nama di sertifikat</span>
            <input
              defaultValue={profile?.certificate_name || ""}
              disabled={certificateLocked}
              name="certificate_name"
              placeholder="Nama resmi untuk sertifikat"
            />
            <small>{certificateLocked ? "Nama sertifikat sudah pernah diubah satu kali." : "Nama ini hanya dapat diubah satu kali."}</small>
          </label>

          <label>
            <span>No Induk Siswa</span>
            <input defaultValue={profile?.student_number || ""} name="student_number" placeholder="Contoh: MDR-2026-001" />
          </label>

          <label>
            <span>Jenis kelamin</span>
            <select defaultValue={profile?.gender || ""} name="gender">
              <option value="">Pilih</option>
              <option value="ikhwan">Ikhwan</option>
              <option value="akhwat">Akhwat</option>
            </select>
          </label>

          <label>
            <span>Tahun lahir</span>
            <input defaultValue={profile?.birth_year || ""} name="birth_year" placeholder="1998" />
          </label>

          <button className="primary-button inline-button" type="submit">Simpan administrasi umum</button>
        </form>
      </section>
    </main>
  );
}
