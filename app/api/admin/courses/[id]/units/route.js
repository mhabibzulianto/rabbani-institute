import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadCourseFiles } from "@/lib/course-files";
import { wibDateTimeToIso } from "@/lib/wib";

const validModuleContentTypes = new Set(["text", "video", "mixed"]);

export async function POST(request, { params }) {
  const { id } = await params;
  const courseId = Number(id);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Silakan login kembali." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!["admin", "instructor"].includes(profile?.role)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  if (!courseId) {
    return NextResponse.json({ error: "Course tidak valid." }, { status: 400 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, instructor_id, course_model, delivery_mode")
    .eq("id", courseId)
    .maybeSingle();

  if (!course || (profile.role !== "admin" && course.instructor_id !== user.id)) {
    return NextResponse.json({ error: "Anda hanya bisa mengelola course milik sendiri." }, { status: 403 });
  }

  const formData = await request.formData();
  const lessonId = Number(formData.get("lessonId"));
  const titleId = readRequired(formData, "titleId");

  if (!titleId) {
    return NextResponse.json({ error: "Title wajib diisi." }, { status: 400 });
  }

  const existingUnitSortOrder = lessonId ? await getExistingUnitSortOrder(supabase, lessonId) : null;
  const payload = buildUnitPayload(formData, course);
  let savedUnit;
  let error;

  if (lessonId) {
    const result = await supabase.from("course_units").update(payload).eq("id", lessonId).select("*").single();
    savedUnit = result.data || null;
    error = result.error;
  } else {
    const result = await supabase.from("course_units").insert(payload).select("*").single();
    savedUnit = result.data || null;
    error = result.error;
  }

  if (shouldFallbackToLegacyUnitSchema(error)) {
    const legacyPayload = buildLegacyUnitPayload(payload);
    if (lessonId) {
      const result = await supabase.from("lessons").update(legacyPayload).eq("id", lessonId).select("*").single();
      savedUnit = result.data ? normalizeLegacyUnit(result.data) : null;
      error = result.error;
    } else {
      const result = await supabase.from("lessons").insert(legacyPayload).select("*").single();
      savedUnit = result.data ? normalizeLegacyUnit(result.data) : null;
      error = result.error;
    }
  }

  if (error || !savedUnit) {
    return NextResponse.json({ error: error?.message || "Gagal menyimpan unit." }, { status: 400 });
  }

  const finalUnitSortOrder = savedUnit.sort_order;

  try {
    if (existingUnitSortOrder !== null && existingUnitSortOrder !== finalUnitSortOrder) {
      const { error: moveDocumentError } = await supabase
        .from("course_documents")
        .update({ unit_sort_order: finalUnitSortOrder, updated_at: new Date().toISOString() })
        .eq("course_id", courseId)
        .eq("unit_sort_order", existingUnitSortOrder);

      if (moveDocumentError && !/course_documents/i.test(moveDocumentError.message || "")) {
        return NextResponse.json({ error: moveDocumentError.message }, { status: 400 });
      }
    }

    const documentFiles = formData.getAll("readingDocuments");
    const uploadedFiles = await uploadCourseFiles({
      courseId,
      files: documentFiles,
      scope: "unit",
      unitSortOrder: finalUnitSortOrder,
    });

    if (uploadedFiles.length) {
      const rows = uploadedFiles.map((document, index) => ({
        course_id: courseId,
        unit_sort_order: finalUnitSortOrder,
        sort_order: index + 1,
        ...document,
      }));
      const { error: documentError } = await supabase.from("course_documents").insert(rows);

      if (documentError) {
        return NextResponse.json({ error: documentError.message }, { status: 400 });
      }
    }
  } catch (documentUploadError) {
    return NextResponse.json({ error: documentUploadError.message }, { status: 400 });
  }

  await syncCourseDuration(supabase, courseId);

  let documents = [];
  const { data: unitDocuments } = await supabase
    .from("course_documents")
    .select("*")
    .eq("course_id", courseId)
    .eq("unit_sort_order", finalUnitSortOrder)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  documents = unitDocuments || [];

  return NextResponse.json({
    message: course.course_model === "madrasah" ? "Sesi tersimpan" : "Modul tersimpan",
    unit: savedUnit,
    previousSortOrder: existingUnitSortOrder,
    documents,
  });
}

function readRequired(formData, key) {
  return formData.get(key)?.toString().trim() || "";
}

function emptyToNull(value) {
  const text = value?.toString().trim();
  return text || null;
}

function emptyDateTimeToNull(value) {
  const text = value?.toString().trim();
  return text ? wibDateTimeToIso(text) : null;
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value?.toString() || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildUnitPayload(formData, course) {
  const payload = {
    course_id: course.id,
    sort_order: toInteger(formData.get("sortOrder"), 0),
    title_id: readRequired(formData, "titleId"),
    title_ar: emptyToNull(formData.get("titleAr")),
    body_id: emptyToNull(formData.get("bodyId")),
    body_ar: emptyToNull(formData.get("bodyAr")),
    duration_minutes: toInteger(formData.get("durationMinutes"), 0),
    is_preview: course.course_model === "mandiri" && formData.get("isPreview") === "on",
    video_url: null,
    meeting_url: null,
    meeting_platform: null,
    scheduled_start_at: null,
    scheduled_end_at: null,
    recording_url: null,
  };

  if (course.course_model === "madrasah") {
    payload.unit_kind = "session";
    if (course.delivery_mode === "synchronous") {
      payload.content_type = "meeting";
      payload.scheduled_start_at = emptyDateTimeToNull(formData.get("scheduledStartAt"));
      payload.scheduled_end_at = emptyDateTimeToNull(formData.get("scheduledEndAt"));
      payload.recording_url = emptyToNull(formData.get("videoUrl"));
      payload.video_url = payload.recording_url;
    } else {
      payload.content_type = "recording";
      payload.recording_url = emptyToNull(formData.get("recordingUrl"));
      payload.video_url = emptyToNull(formData.get("videoUrl"));
    }

    return payload;
  }

  const contentType = formData.get("contentType")?.toString() || "text";
  payload.unit_kind = "module";
  payload.content_type = validModuleContentTypes.has(contentType) ? contentType : "text";
  payload.video_url = emptyToNull(formData.get("videoUrl"));
  return payload;
}

function buildLegacyUnitPayload(payload) {
  const {
    unit_kind,
    meeting_url,
    meeting_platform,
    recording_url,
    ...legacyPayload
  } = payload;

  if (payload.content_type === "meeting") {
    legacyPayload.content_type = legacyPayload.video_url || recording_url ? "video" : "text";
    legacyPayload.video_url = legacyPayload.video_url || recording_url || null;
  } else if (payload.content_type === "recording") {
    legacyPayload.content_type = legacyPayload.video_url || recording_url ? "video" : "text";
    legacyPayload.video_url = legacyPayload.video_url || recording_url || null;
  }

  return legacyPayload;
}

function normalizeLegacyUnit(unit) {
  return {
    ...unit,
    unit_kind: unit.unit_kind || "module",
    meeting_url: unit.meeting_url || null,
    meeting_platform: unit.meeting_platform || null,
    scheduled_start_at: unit.scheduled_start_at || null,
    scheduled_end_at: unit.scheduled_end_at || null,
    recording_url: unit.recording_url || null,
  };
}

async function getExistingUnitSortOrder(supabase, lessonId) {
  let result = await supabase.from("course_units").select("sort_order").eq("id", lessonId).maybeSingle();

  if (shouldFallbackToLegacyUnitSchema(result.error)) {
    result = await supabase.from("lessons").select("sort_order").eq("id", lessonId).maybeSingle();
  }

  if (result.error) {
    console.error(result.error);
    return null;
  }

  return result.data?.sort_order ?? null;
}

async function syncCourseDuration(supabase, courseId) {
  let result = await supabase
    .from("course_units")
    .select("duration_minutes")
    .eq("course_id", courseId);

  if (shouldFallbackToLegacyUnitSchema(result.error)) {
    result = await supabase
      .from("lessons")
      .select("duration_minutes")
      .eq("course_id", courseId);
  }

  if (result.error) {
    console.error(result.error);
    return;
  }

  const totalDuration = (result.data || []).reduce((sum, unit) => sum + (unit.duration_minutes || 0), 0);
  const { error: updateError } = await supabase
    .from("courses")
    .update({ duration_minutes: totalDuration })
    .eq("id", courseId);

  if (updateError) {
    console.error(updateError);
  }
}

function shouldFallbackToLegacyUnitSchema(error) {
  if (!error?.message) {
    return false;
  }

  return (
    /relation ["']public\.course_units["'] does not exist/i.test(error.message)
    || /relation ["']course_units["'] does not exist/i.test(error.message)
    || /Could not find the table ['"]public\.course_units['"] in the schema cache/i.test(error.message)
    || /Could not find the table ['"]course_units['"] in the schema cache/i.test(error.message)
  );
}
