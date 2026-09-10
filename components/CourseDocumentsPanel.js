"use client";

import { useMemo, useRef, useState } from "react";

export default function CourseDocumentsPanel({ courseId, documents = [], schemaReady = true }) {
  const [items, setItems] = useState(documents);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const inputRef = useRef(null);

  const generalDocuments = useMemo(
    () => items.filter((document) => document.unit_sort_order == null),
    [items],
  );

  if (!schemaReady) {
    return (
      <section className="panel">
        <p className="section-label">Dokumen course</p>
        <p>Schema dokumen course belum aktif di database. Jalankan patch SQL fitur kuis & dokumen terlebih dahulu.</p>
      </section>
    );
  }

  async function handleUpload(event) {
    event.preventDefault();
    const files = inputRef.current?.files;

    if (!files?.length) {
      setNotice({ type: "error", message: "Pilih minimal satu dokumen yang didukung." });
      return;
    }

    setIsUploading(true);
    setNotice({ type: "", message: "" });

    const formData = new FormData();
    for (const file of files) {
      formData.append("documents", file);
    }

    try {
      const response = await fetch(`/api/studio/courses/${courseId}/documents`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengunggah dokumen.");
      }

      setItems(result.documents || []);
      setNotice({
        type: "success",
        message: result.message || "Dokumen course berhasil diunggah.",
      });

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Gagal mengunggah dokumen.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(documentId) {
    setDeletingId(documentId);
    setNotice({ type: "", message: "" });

    try {
      const response = await fetch(`/api/studio/courses/${courseId}/documents/${documentId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menghapus dokumen.");
      }

      setItems(result.documents || []);
      setNotice({
        type: "success",
        message: result.message || "Dokumen berhasil dihapus.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Gagal menghapus dokumen.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel">
      <p className="section-label">Dokumen course</p>
      <h2>Bahan belajar utama</h2>
      <p className="muted-line">
        Upload file PDF, Word, atau dokumen lain sebagai bahan belajar umum untuk seluruh course.
      </p>

      {notice.message ? <p className={`notice ${notice.type}`}>{notice.message}</p> : null}

      <form onSubmit={handleUpload} className="editor-form compact top-space-md">
        <label>
          Upload dokumen
          <input
            ref={inputRef}
            type="file"
            name="documents"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.rtf"
            disabled={isUploading}
          />
        </label>
        <button className="button primary small" type="submit" disabled={isUploading}>
          {isUploading ? "Mengunggah..." : "Upload dokumen course"}
        </button>
      </form>

      <div className="resource-list top-space-md">
        {generalDocuments.length === 0 ? <p>Belum ada dokumen umum untuk course ini.</p> : null}
        {generalDocuments.map((document) => (
          <article className="resource-item" key={document.id}>
            <div>
              <strong>{document.title}</strong>
              <p className="muted-line">{document.file_name}</p>
            </div>
            <div className="inline-form">
              <a className="button secondary small" href={`/api/course-documents/${document.id}`}>
                Lihat dokumen
              </a>
              <button
                className="button secondary small"
                type="button"
                onClick={() => handleDelete(document.id)}
                disabled={deletingId === document.id}
              >
                {deletingId === document.id ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
