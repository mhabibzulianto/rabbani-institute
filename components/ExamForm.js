"use client";

import { createExamModule, updateExamModule } from "@/app/admin/actions";
import { toWibDateInputValue } from "@/lib/wib";

export default function ExamForm({ exam, message, error }) {
  const isEditing = Boolean(exam?.id);
  const action = isEditing ? updateExamModule : createExamModule;
  const allowedPhones = exam?.allowed_phones?.map((item) => item.phone).join("\n") || "";

  return (
    <form className="panel editor-form" action={action}>
      {message ? <p className="notice success">{message}</p> : null}
      {error ? <p className="notice error">{error}</p> : null}
      {isEditing ? <input type="hidden" name="examId" value={exam.id} /> : null}

      <div className="form-grid two">
        <label>
          Judul ujian
          <input name="title" defaultValue={exam?.title || ""} required />
        </label>
        <label>
          Slug
          <input name="slug" defaultValue={exam?.slug || ""} placeholder="ujian-susulan-nahwu-1" required />
        </label>
      </div>

      <label>
        Subtitle
        <textarea name="subtitle" rows="3" defaultValue={exam?.subtitle || ""} />
      </label>

      <div className="form-grid two">
        <label>
          Deskripsi singkat
          <textarea name="description" rows="5" defaultValue={exam?.description || ""} />
        </label>
        <label>
          Instruksi ujian
          <textarea
            name="instructions"
            rows="5"
            defaultValue={exam?.instructions || ""}
            placeholder="Contoh: baca bismillah, siapkan koneksi stabil, jangan refresh browser selama ujian."
          />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Ujian dibuka
          <input
            type="date"
            name="opensAt"
            defaultValue={toWibDateInputValue(exam?.opens_at)}
            required
          />
        </label>
        <label>
          Ujian ditutup
          <input
            type="date"
            name="closesAt"
            defaultValue={toWibDateInputValue(exam?.closes_at)}
            required
          />
        </label>
      </div>
      <p className="field-note">Semua tanggal ujian dibaca dan disimpan dalam zona waktu WIB (Asia/Jakarta).</p>

      <div className="form-grid three">
        <label>
          Timer ujian (menit)
          <input type="number" name="durationMinutes" min="1" step="1" defaultValue={exam?.duration_minutes || 60} required />
        </label>
        <label>
          Maksimal attempt
          <input type="number" name="maxAttempts" min="1" step="1" defaultValue={exam?.max_attempts || 1} required />
        </label>
        <label className="check-label">
          <input type="checkbox" name="isPublished" defaultChecked={Boolean(exam?.is_published)} />
          Publish modul ujian
        </label>
      </div>

      <label>
        Daftar nomor WhatsApp yang diizinkan
        <textarea
          name="allowedPhones"
          rows="6"
          defaultValue={allowedPhones}
          placeholder={"Satu nomor per baris\n6281234567890\n6289876543210"}
        />
        <span className="field-note">
          Kosongkan jika ujian boleh diikuti siapa saja. Format yang disarankan: 628xxxxxxxxxx.
        </span>
      </label>

      <button className="button primary" type="submit">
        {isEditing ? "Simpan modul ujian" : "Buat modul ujian"}
      </button>
    </form>
  );
}
