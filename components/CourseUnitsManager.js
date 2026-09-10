"use client";

import { useMemo, useState } from "react";
import DeleteUnitForm from "@/components/DeleteUnitForm";
import { deleteCourseDocument, deleteLesson } from "@/app/admin/actions";
import { toWibDateTimeInputValue } from "@/lib/wib";

const moduleContentTypes = ["text", "video", "mixed"];

export default function CourseUnitsManager({ course, initialUnits, initialDocuments, documentSchemaReady }) {
  const [units, setUnits] = useState(initialUnits || []);
  const [documents, setDocuments] = useState(initialDocuments || []);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const unitTerm = course.course_model === "madrasah" ? "sesi" : "modul";

  const sortedUnits = useMemo(
    () => [...units].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id),
    [units],
  );

  async function handleSave(formData, { resetAfterSave = false, formElement = null, lessonId = null }) {
    setNotice({ type: "", message: "" });

    const response = await fetch(`/api/admin/courses/${course.id}/units`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      setNotice({ type: "error", message: payload.error || `Gagal menyimpan ${unitTerm}.` });
      return;
    }

    const savedUnit = payload.unit;
    const previousUnit = lessonId ? units.find((unit) => unit.id === lessonId) : null;

    setUnits((currentUnits) => {
      const withoutCurrent = lessonId ? currentUnits.filter((unit) => unit.id !== lessonId) : currentUnits;
      return [...withoutCurrent, savedUnit];
    });

    if (documentSchemaReady) {
      setDocuments((currentDocuments) => {
        const occupiedOrders = new Set(
          [payload.previousSortOrder, previousUnit?.sort_order, savedUnit.sort_order].filter((value) => Number.isFinite(value)),
        );

        const preserved = currentDocuments.filter((document) => !occupiedOrders.has(document.unit_sort_order));
        return [...preserved, ...(payload.documents || [])];
      });
    }

    setNotice({ type: "success", message: payload.message || `${capitalize(unitTerm)} tersimpan.` });

    if (resetAfterSave && formElement) {
      formElement.reset();
    }
  }

  return (
    <section className="admin-actions-grid">
      <article className="panel">
        <p className="section-label">New {unitTerm}</p>
        {notice.message ? <p className={`notice ${notice.type}`}>{notice.message}</p> : null}
        <UnitForm
          course={course}
          documentSchemaReady={documentSchemaReady}
          onSave={handleSave}
          resetAfterSave
        />
      </article>
      <article className="panel">
        <p className="section-label">Current {unitTerm}</p>
        <div className="lesson-list">
          {sortedUnits.length === 0 ? <p>Belum ada {unitTerm}.</p> : null}
          {sortedUnits.map((unit) => {
            const unitDocuments = documents.filter((document) => document.unit_sort_order === unit.sort_order);

            return (
              <details className="lesson-editor" key={buildUnitEditorKey(unit)}>
                <summary>
                  <strong>
                    {unit.sort_order}. {unit.title_id}
                  </strong>
                  <span>{renderUnitMeta(course, unit)}</span>
                </summary>
                <UnitForm
                  course={course}
                  unit={unit}
                  documentSchemaReady={documentSchemaReady}
                  onSave={handleSave}
                />
                {documentSchemaReady ? (
                  <div className="resource-list top-space-md">
                    {unitDocuments.length === 0 ? <p>Belum ada reading assignment untuk {unitTerm} ini.</p> : null}
                    {unitDocuments.map((document) => (
                      <article className="resource-item" key={document.id}>
                        <div>
                          <strong>{document.title}</strong>
                          <p className="muted-line">{document.file_name}</p>
                        </div>
                        <div className="inline-form">
                          <a className="button secondary small" href={`/api/course-documents/${document.id}`}>
                            Buka dokumen
                          </a>
                          <form action={deleteCourseDocument}>
                            <input type="hidden" name="courseId" value={course.id} />
                            <input type="hidden" name="documentId" value={document.id} />
                            <input type="hidden" name="nextSection" value="lessons" />
                            <button className="button secondary small" type="submit">
                              Hapus dokumen
                            </button>
                          </form>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
                <DeleteUnitForm
                  action={deleteLesson}
                  courseId={course.id}
                  lessonId={unit.id}
                  label={`Hapus ${course.course_model === "madrasah" ? "sesi" : "modul"}`}
                  confirmMessage={`Yakin ingin menghapus ${course.course_model === "madrasah" ? "sesi" : "modul"} ini? Tindakan ini tidak bisa dibatalkan.`}
                />
              </details>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function UnitForm({ course, unit, documentSchemaReady, onSave, resetAfterSave = false }) {
  const isMadrasah = course.course_model === "madrasah";
  const isSynchronous = course.delivery_mode === "synchronous";
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const formElement = event.currentTarget;
      const formData = new FormData(formElement);
      await onSave(formData, {
        resetAfterSave,
        formElement,
        lessonId: unit?.id || null,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="editor-form compact" onSubmit={handleSubmit}>
      <input type="hidden" name="courseId" value={course.id} />
      {unit ? <input type="hidden" name="lessonId" value={unit.id} /> : null}
      <div className="form-grid two">
        <label>
          Sort order
          <input name="sortOrder" type="number" min="0" defaultValue={unit?.sort_order || 1} />
        </label>
        {!isMadrasah ? (
          <label>
            Tipe modul
            <select name="contentType" defaultValue={unit?.content_type || "text"}>
              {moduleContentTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="status-chip-wrap">
            <span className="section-label">Delivery mode</span>
            <span className="pill">{course.delivery_mode}</span>
          </div>
        )}
      </div>
      <label>
        Title ID
        <input name="titleId" defaultValue={unit?.title_id || ""} required />
      </label>
      <label>
        Title AR
        <input name="titleAr" defaultValue={unit?.title_ar || ""} dir="rtl" />
      </label>
      <label>
        Body ID
        <textarea name="bodyId" rows="4" defaultValue={unit?.body_id || ""} />
      </label>
      <label>
        Body AR
        <textarea name="bodyAr" rows="4" defaultValue={unit?.body_ar || ""} dir="rtl" />
      </label>

      {isMadrasah ? (
        isSynchronous ? (
          <div className="form-grid two">
            <label>
              Sesi mulai
              <input
                name="scheduledStartAt"
                type="datetime-local"
                defaultValue={toWibDateTimeInputValue(unit?.scheduled_start_at)}
              />
            </label>
            <label>
              Sesi berakhir
              <input
                name="scheduledEndAt"
                type="datetime-local"
                defaultValue={toWibDateTimeInputValue(unit?.scheduled_end_at)}
              />
            </label>
            <label>
              Link rekaman kelas
              <input name="videoUrl" type="url" defaultValue={unit?.recording_url || unit?.video_url || ""} />
            </label>
          </div>
        ) : (
          <div className="form-grid two">
            <label>
              Recording URL
              <input name="recordingUrl" type="url" defaultValue={unit?.recording_url || ""} />
            </label>
            <label>
              Video fallback URL
              <input name="videoUrl" type="url" defaultValue={unit?.video_url || ""} />
            </label>
          </div>
        )
      ) : (
        <div className="form-grid two">
          <label>
            Video URL
            <input name="videoUrl" type="url" defaultValue={unit?.video_url || ""} />
          </label>
          <label>
            Duration minutes
            <input name="durationMinutes" type="number" min="0" defaultValue={unit?.duration_minutes || 0} />
          </label>
        </div>
      )}

      {isMadrasah ? (
        <>
          {isSynchronous ? (
            <p className="field-note">
              Link live class diambil dari metadata course. Di sini kamu hanya mengatur jadwal sesi dan link rekamannya.
            </p>
          ) : null}
          <label>
            Duration minutes
            <input name="durationMinutes" type="number" min="0" defaultValue={unit?.duration_minutes || 0} />
          </label>
        </>
      ) : null}

      {documentSchemaReady ? (
        <label>
          Reading assignment
          <input
            type="file"
            name="readingDocuments"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.rtf"
          />
          <span className="field-note">Upload dokumen bacaan untuk {isMadrasah ? "sesi" : "modul"} ini.</span>
        </label>
      ) : (
        <p className="field-note">Schema dokumen course belum aktif, jadi upload reading assignment belum tersedia.</p>
      )}

      {!isMadrasah ? (
        <label className="check-label">
          <input type="checkbox" name="isPreview" defaultChecked={Boolean(unit?.is_preview)} />
          Preview modul
        </label>
      ) : null}
      <button className="button primary small" type="submit" disabled={isSaving}>
        {isSaving ? "Menyimpan..." : `Save ${isMadrasah ? "sesi" : "modul"}`}
      </button>
    </form>
  );
}

function renderUnitMeta(course, unit) {
  const parts = [getContentTypeLabel(unit.content_type), minutesToLabel(unit.duration_minutes)];

  if (course.course_model === "madrasah" && unit.scheduled_start_at) {
    parts.push(formatDateTime(unit.scheduled_start_at));
  }

  return parts.join(" - ");
}

function buildUnitEditorKey(unit) {
  return [
    unit.id,
    unit.sort_order,
    unit.title_id,
    unit.title_ar || "",
    unit.duration_minutes || 0,
    unit.video_url || "",
    unit.recording_url || "",
    unit.scheduled_start_at || "",
    unit.scheduled_end_at || "",
  ].join(":");
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function minutesToLabel(minutes) {
  if (!minutes) {
    return "0 menit";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours && remainingMinutes) {
    return `${hours} jam ${remainingMinutes} menit`;
  }

  if (hours) {
    return `${hours} jam`;
  }

  return `${remainingMinutes} menit`;
}

function getContentTypeLabel(contentType) {
  switch (contentType) {
    case "meeting":
      return "Live meeting";
    case "recording":
      return "Rekaman";
    case "video":
      return "Video";
    case "mixed":
      return "Campuran";
    default:
      return "Teks";
  }
}

function formatDateTime(value, locale = "id-ID") {
  if (!value) {
    return "-";
  }

  return `${new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))} WIB`;
}
