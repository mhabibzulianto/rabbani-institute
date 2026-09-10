import { NextResponse } from "next/server";
import { createCourseDocumentSignedUrl } from "@/lib/course-files";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function GET(_request, { params }) {
  const { id } = await params;
  const documentId = Number(id);

  if (!documentId) {
    return NextResponse.json({ error: "Dokumen tidak valid." }, { status: 400 });
  }

  const { user, profile } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Silakan login untuk membuka dokumen." }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: document, error } = await supabase
    .from("course_documents")
    .select("id, course_id, title, bucket_id, storage_path, file_name, unit_sort_order, course:courses(id, slug, status, instructor_id)")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !document) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  const isOwner = profile?.role === "admin" || document.course?.instructor_id === user.id;
  const isPublishedCourse = document.course?.status === "published";

  if (!isOwner && !isPublishedCourse) {
    return NextResponse.json({ error: "Anda tidak memiliki akses ke dokumen ini." }, { status: 403 });
  }

  try {
    const signedUrl = await createCourseDocumentSignedUrl(document);
    return NextResponse.redirect(signedUrl);
  } catch (caughtError) {
    return NextResponse.json({ error: caughtError.message || "Gagal membuka dokumen." }, { status: 500 });
  }
}
