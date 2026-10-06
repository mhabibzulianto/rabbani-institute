import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccessEditorial } from "@/lib/access.mjs";
import { MEDIA_BUCKET, validateMediaMetadata, validateMediaBytes } from "@/lib/media-validation.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  // Route uploads avoid the 1 MB server-action limit. No service-role credentials.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "Permintaan upload tidak valid." }, { status: 403 });
  const { user, profile } = await getCurrentUser();
  if (!user || !canAccessEditorial(profile)) return NextResponse.json({ error: "Masuk dengan akun editorial sebelum mengunggah." }, { status: 403 });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length < 1 || length > 51 * 1024 * 1024) return NextResponse.json({ error: "Ukuran permintaan upload maksimal 51 MB." }, { status: 413 });
  let file, metadata, bytes;
  try {
    const form = await request.formData();
    file = form.get("file");
    if (!(file instanceof File)) throw new Error("Pilih file yang akan diunggah.");
    metadata = validateMediaMetadata({ name: file.name, type: file.type, size: file.size, alt: form.get("alt") || "", caption: form.get("caption") || "" });
    bytes = new Uint8Array(await file.arrayBuffer());
    validateMediaBytes(file.type, bytes);
  } catch (error) { return NextResponse.json({ error: error.message || "File tidak valid." }, { status: 400 }); }
  const supabase = await createSupabaseServerClient();
  const id = randomUUID();
  const path = `${user.id}/${id}.${metadata.extension}`;
  const { extension: _extension, ...fields } = metadata;
  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (uploadError) return NextResponse.json({ error: "Upload gagal. Pastikan penyimpanan media sudah disiapkan, lalu coba lagi." }, { status: 503 });
  const { data, error } = await supabase.from("editorial_media").insert({ id, owner_id: user.id, path, ...fields }).select("*").single();
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return NextResponse.json({ error: "Media belum tercatat. Coba lagi setelah penyimpanan media tersedia." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, asset: { ...data, url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl } });
}
