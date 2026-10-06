"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditorialUser } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createArticleDraft(formData) {
  const { user } = await requireEditorialUser();
  const title = formData.get("title")?.toString().trim() || "";
  const excerpt = formData.get("excerpt")?.toString().trim() || "";
  if (!title || title.length > 200 || excerpt.length > 500) {
    redirect(`/artikel/baru?error=validation&title=${encodeURIComponent(title.slice(0, 200))}&excerpt=${encodeURIComponent(excerpt.slice(0, 500))}`);
  }
  const supabase = await createSupabaseServerClient();
  const slugBase = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "artikel";
  const { data, error } = await supabase.from("articles").insert({
    author_id: user.id, title, slug: `${slugBase}-${randomUUID()}`, excerpt: excerpt || null, status: "draft",
  }).select("id").single();
  if (error) {
    console.error("Create Editorial draft:", error.code);
    redirect(`/artikel/baru?error=save&title=${encodeURIComponent(title)}&excerpt=${encodeURIComponent(excerpt)}`);
  }
  revalidatePath("/artikel");
  redirect(`/artikel/${data.id}/edit?created=1`);
}
