"use client";

import { useMemo, useState } from "react";
import { createCourse, updateCourse } from "@/app/admin/actions";
import RichTextField from "@/components/RichTextField";
import { toWibDateInputValue } from "@/lib/wib";

export default function CourseForm({ course, categories, instructors, profile, message, error }) {
  const isEditing = Boolean(course?.id);
  const isAdmin = profile?.role === "admin";
  const action = isEditing ? updateCourse : createCourse;
  const [courseModel, setCourseModel] = useState(course?.course_model || "mandiri");
  const [deliveryMode, setDeliveryMode] = useState(course?.delivery_mode || "synchronous");

  const unitLabel = useMemo(() => (courseModel === "madrasah" ? "sesi" : "modul"), [courseModel]);

  return (
    <form className="panel editor-form" action={action}>
      {message ? <p className="notice success">{message}</p> : null}
      {error ? <p className="notice error">{error}</p> : null}
      {isEditing ? <input type="hidden" name="courseId" value={course.id} /> : null}

      {!isAdmin ? (
        <p className="notice success">
          Teacher submissions are saved as drafts. An admin must approve and publish the course before it appears live.
        </p>
      ) : null}

      {course ? (
        <div className="form-grid two">
          <div className="status-chip-wrap">
            <span className="section-label">Catalog status</span>
            <span className={`pill status-${course.status}`}>{course.status}</span>
          </div>
          <div className="status-chip-wrap">
            <span className="section-label">Review status</span>
            <span className={`pill status-${course.review_status}`}>{course.review_status}</span>
          </div>
        </div>
      ) : null}

      <div className="form-grid two">
        <label>
          Title ID
          <input name="titleId" defaultValue={course?.title_id || ""} required />
        </label>
        <label>
          Title AR
          <input name="titleAr" defaultValue={course?.title_ar || ""} dir="rtl" />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Slug
          <input name="slug" defaultValue={course?.slug || ""} placeholder="bahasa-arab-dasar" required />
        </label>
        <label>
          Category
          <select name="categoryId" defaultValue={course?.category_id || ""} required>
            <option value="" disabled>
              Select category
            </option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.title_id}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Course model
          <select
            name="courseModel"
            value={courseModel}
            onChange={(event) => setCourseModel(event.target.value)}
          >
            <option value="mandiri">Kelas Mandiri</option>
            <option value="madrasah">Kelas Madrasah</option>
          </select>
        </label>
        <label>
          Delivery mode
          <select
            name="deliveryMode"
            value={deliveryMode}
            onChange={(event) => setDeliveryMode(event.target.value)}
            disabled={courseModel !== "madrasah"}
          >
            <option value="synchronous">Synchronous</option>
            <option value="asynchronous">Asynchronous</option>
          </select>
        </label>
      </div>

      {courseModel === "madrasah" ? (
        <>
          <div className="form-grid two">
            <label>
              Pendaftaran dibuka
              <input
                name="enrollmentOpensAt"
                type="date"
                defaultValue={toWibDateInputValue(course?.enrollment_opens_at)}
                required
              />
            </label>
            <label>
              Pendaftaran ditutup
              <input
                name="enrollmentClosesAt"
                type="date"
                defaultValue={toWibDateInputValue(course?.enrollment_closes_at || course?.starts_at)}
                required
              />
            </label>
          </div>
          <div className="form-grid two">
            <label>
              Kelas mulai
              <input
                name="startsAt"
                type="date"
                defaultValue={toWibDateInputValue(course?.starts_at)}
                required
              />
            </label>
          </div>
          <div className="form-grid two">
            <label>
              Durasi kelas (minggu)
              <input
                name="durationWeeks"
                type="number"
                min="1"
                step="1"
                defaultValue={course?.duration_weeks || ""}
                required
              />
            </label>
            <label>
              Kelas berakhir
              <input
                name="endsAt"
                type="date"
                defaultValue={toWibDateInputValue(course?.ends_at)}
                required
              />
            </label>
          </div>
          <div className="form-grid two">
            {deliveryMode === "synchronous" ? (
              <label>
                Jumlah sesi
                <input
                  name="sessionCount"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={course?.session_count || ""}
                  required
                />
              </label>
            ) : (
              <div className="panel inline-note">
                <strong>Kelas asynchronous</strong>
                <p>Jumlah sesi akan mengikuti daftar sesi yang kamu susun di builder.</p>
              </div>
            )}
            {deliveryMode === "synchronous" ? (
              <label>
                Platform live class
                <select name="livePlatform" defaultValue={course?.live_platform || "zoom"} required>
                  <option value="zoom">Zoom</option>
                  <option value="google-meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                </select>
              </label>
            ) : (
              <div className="panel inline-note">
                <strong>Tanpa live platform</strong>
                <p>Kelas asynchronous akan menampilkan rekaman atau materi video di tiap sesi.</p>
              </div>
            )}
          </div>
          {deliveryMode === "synchronous" ? (
            <div className="form-grid two">
              <label>
                Link pertemuan
                <input
                  name="liveMeetingUrl"
                  type="url"
                  defaultValue={course?.live_meeting_url || ""}
                  placeholder="https://..."
                  required
                />
              </label>
              <div className="panel inline-note">
                <strong>Satu link untuk seluruh course</strong>
                <p>Gunakan satu link Zoom, Google Meet, atau Teams yang sama untuk semua sesi live.</p>
              </div>
            </div>
          ) : null}
          <p className="field-note">
            Semua tanggal course dibaca dan disimpan dalam zona waktu WIB (Asia/Jakarta).
            {deliveryMode === "synchronous"
              ? " Untuk kelas synchronous, link live disimpan di level course dan sesi hanya menyimpan jadwal serta link rekaman."
              : ""}
          </p>
        </>
      ) : null}

      <div className="form-grid two">
        <label>
          Short description ID
          <textarea name="shortDescriptionId" rows="3" defaultValue={course?.short_description_id || ""} />
        </label>
        <label>
          Short description AR
          <textarea name="shortDescriptionAr" rows="3" defaultValue={course?.short_description_ar || ""} dir="rtl" />
        </label>
      </div>

      <div className="form-grid two">
        <RichTextField
          label="Tujuan kelas ID"
          name="goalsId"
          rows={8}
          defaultValue={course?.goals_id || ""}
          helperText="Format yang tersedia: tebal, miring, daftar bernomor, dan daftar poin."
        />
        <RichTextField
          label="Tujuan kelas AR"
          name="goalsAr"
          rows={8}
          dir="rtl"
          defaultValue={course?.goals_ar || ""}
          helperText="Gunakan tombol format yang sama untuk versi Arab."
        />
      </div>

      <div className="form-grid two">
        <label>
          Full description ID
          <textarea name="descriptionId" rows="6" defaultValue={course?.description_id || ""} />
        </label>
        <label>
          Full description AR
          <textarea name="descriptionAr" rows="6" defaultValue={course?.description_ar || ""} dir="rtl" />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Level
          <input name="level" defaultValue={course?.level || "Pemula"} />
        </label>
        <label>
          Thumbnail URL
          <input name="thumbnailUrl" type="url" defaultValue={course?.thumbnail_url || ""} />
        </label>
      </div>

      <div className="form-grid two">
        <label>
          Harga kelas (IDR)
          <input
            name="priceIdr"
            type="number"
            min="0"
            step="1000"
            defaultValue={course?.price_idr || 0}
          />
        </label>
        <div className="panel inline-note">
          <strong>Portal pembayaran</strong>
          <p>Isi 0 untuk kelas gratis. Jika harga lebih dari 0, halaman course akan memakai flow Midtrans Snap.</p>
        </div>
      </div>

      <p className="muted-line">
        Durasi course dihitung otomatis dari total durasi {unitLabel}. {courseModel === "madrasah"
          ? "Untuk Kelas Madrasah, peserta akan melihat jadwal pendaftaran dan jadwal kelas."
          : "Untuk Kelas Mandiri, peserta bisa langsung mulai setelah mendaftar."}
      </p>

      {isAdmin ? (
        <>
          <div className="form-grid three">
            <label>
              Instructor
              <select name="instructorId" defaultValue={course?.instructor_id || profile.id}>
                {instructors.map((instructor) => (
                  <option value={instructor.id} key={instructor.id}>
                    {instructor.full_name || instructor.id} ({instructor.role})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue={course?.status || "draft"}>
                <option value="draft">draft</option>
                <option value="beta">beta</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label className="check-label">
              <input type="checkbox" name="featured" defaultChecked={Boolean(course?.featured)} />
              Featured
            </label>
          </div>
          <p className="muted-line">
            Mengganti instructor akan memindahkan kepemilikan course. Setelah disimpan, instructor yang dipilih akan
                  langsung melihat course ini di Studio.
          </p>
        </>
      ) : null}

      <button className="button primary" type="submit">
        {isEditing ? "Save course" : "Create course draft"}
      </button>
    </form>
  );
}
