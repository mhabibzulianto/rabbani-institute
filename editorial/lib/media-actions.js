"use server";

import { revalidatePath } from "next/cache";
import { requireEditorialUser } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET, MEDIA_LABELS } from "@/lib/media-validation.mjs";

export async function listEditorialMedia({ q = "", kind = "", page = 1 } = {}) {
  const { user, profile } = await requireEditorialUser();
  const supabase = await createSupabaseServerClient();
  const currentPage = Math.max(1, Math.min(10000, Number.parseInt(page, 10) || 1));
  let query = supabase.from("editorial_media").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id").range((currentPage - 1) * 24, currentPage * 24 - 1);
  if (profile.role !== "admin") query = query.eq("owner_id", user.id);
  if (MEDIA_LABELS[kind]) query = query.eq("kind", kind);
  if (typeof q === "string" && q.trim()) query = query.ilike("name", `%${q.trim().slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`);
  const { data, count, error } = await query;
  if (error) return { ok: false, items: [], total: 0, error: "Pustaka media belum dapat dimuat. Pastikan penyimpanan media sudah disiapkan dan koneksi tersedia." };
  return { ok: true, items: data.map((item) => ({ ...item, url: supabase.storage.from(MEDIA_BUCKET).getPublicUrl(item.path).data.publicUrl })), total: count, page: currentPage };
}

export async function createEditorialCategory(title) {
  await requireEditorialUser();
  if (typeof title !== "string" || title.trim().length < 2 || title.trim().length > 120) return { ok: false, error: "Nama kategori harus berisi 2–120 karakter." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_editorial_category", { category_title: title.trim() });
  if (error) return { ok: false, error: "Kategori belum dapat ditambahkan. Pastikan patch media sudah diterapkan dan koneksi tersedia." };
  revalidatePath("/artikel");
  return { ok: true, category: Array.isArray(data) ? data[0] : data };
}
