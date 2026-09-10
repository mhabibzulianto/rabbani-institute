import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const COURSE_FILE_BUCKET = "course-files";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "application/rtf",
]);

export function isAllowedCourseFile(file) {
  return Boolean(file?.name) && allowedMimeTypes.has(file.type || "");
}

export function getCourseFileAdminClient() {
  const admin = createSupabaseAdminClient();

  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum tersedia untuk upload dokumen.");
  }

  return admin;
}

export async function uploadCourseFiles({
  courseId,
  files,
  scope = "course",
  unitSortOrder = null,
}) {
  const admin = getCourseFileAdminClient();
  const uploaded = [];

  for (const rawFile of files) {
    if (!(rawFile instanceof File) || !rawFile.size) {
      continue;
    }

    if (!isAllowedCourseFile(rawFile)) {
      throw new Error(`Format file "${rawFile.name}" belum didukung.`);
    }

    const safeName = sanitizeFileName(rawFile.name);
    const scopePath = scope === "unit" ? `units/${unitSortOrder || "unknown"}` : "general";
    const storagePath = `courses/${courseId}/${scopePath}/${Date.now()}-${safeName}`;
    const bytes = new Uint8Array(await rawFile.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(COURSE_FILE_BUCKET)
      .upload(storagePath, bytes, {
        contentType: rawFile.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    uploaded.push({
      title: stripFileExtension(rawFile.name),
      file_name: rawFile.name,
      bucket_id: COURSE_FILE_BUCKET,
      storage_path: storagePath,
      mime_type: rawFile.type || null,
      file_size_bytes: rawFile.size,
      unit_sort_order: scope === "unit" ? unitSortOrder : null,
    });
  }

  return uploaded;
}

export async function removeStoredCourseFile(document) {
  if (!document?.bucket_id || !document?.storage_path) {
    return;
  }

  const admin = getCourseFileAdminClient();
  await admin.storage.from(document.bucket_id).remove([document.storage_path]);
}

export async function createCourseDocumentSignedUrl(document, expiresInSeconds = 300) {
  const admin = getCourseFileAdminClient();
  const { data, error } = await admin.storage
    .from(document.bucket_id || COURSE_FILE_BUCKET)
    .createSignedUrl(document.storage_path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Gagal membuat link dokumen.");
  }

  return data.signedUrl;
}

export function sanitizeFileName(fileName) {
  const sanitized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return sanitized || `file-${Date.now()}`;
}

function stripFileExtension(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}
