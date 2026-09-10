import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getPublishedExamModules() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("exam_modules")
    .select("id, slug, title, subtitle, opens_at, closes_at, duration_minutes, max_attempts")
    .eq("is_published", true)
    .order("opens_at", { ascending: true });

  if (error) {
    if (isMissingExamSchema(error)) {
      return [];
    }

    console.error(error);
    return [];
  }

  return data || [];
}

export async function getPublicExamModuleBySlug(slug) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam_modules")
    .select("id, slug, title, subtitle, description, instructions, opens_at, closes_at, duration_minutes, max_attempts, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    if (isMissingExamSchema(error)) {
      return { schemaReady: false, exam: null };
    }

    console.error(error);
    return { schemaReady: true, exam: null };
  }

  if (!data) {
    return { schemaReady: true, exam: null };
  }

  const { count: questionCount } = await supabase
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", data.id);

  return {
    schemaReady: true,
    exam: {
      ...data,
      question_count: questionCount || 0,
    },
  };
}

export function isMissingExamSchema(error) {
  return error?.code === "42P01" || /exam_modules|exam_questions|exam_allowed_phones|exam_attempts|exam_otp_codes/i.test(error?.message || "");
}
