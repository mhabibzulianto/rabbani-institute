import { createSupabaseServerClient } from "@/lib/supabase/server";

function isMissingSchemaError(error) {
  const message = error?.message || "";
  return (
    error?.code === "42P01"
    || error?.code === "42703"
    || /does not exist/i.test(message)
    || /Could not find .*schema cache/i.test(message)
  );
}

export function formatIdr(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function touchMadrasahMembership(userId) {
  if (!userId) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("account_app_memberships")
    .upsert(
      {
        user_id: userId,
        app_slug: "madrasah",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,app_slug" },
    );

  if (error && !isMissingSchemaError(error)) {
    console.error(error);
  }
}

async function getEnrollmentsModern(supabase, userId) {
  const result = await supabase
    .from("enrollments")
    .select("id, status, enrolled_at, course:courses(id, slug, title_id, course_model, starts_at, ends_at, duration_weeks, session_count)")
    .eq("student_id", userId)
    .order("enrolled_at", { ascending: false });

  if (result.error) {
    return { data: null, error: result.error };
  }

  return { data: result.data || [], error: null };
}

async function getEnrollmentsLegacy(supabase, userId) {
  const result = await supabase
    .from("enrollments")
    .select("id, status, enrolled_at, course:courses(id, slug, title_id)")
    .eq("student_id", userId)
    .order("enrolled_at", { ascending: false });

  if (result.error) {
    console.error(result.error);
    return [];
  }

  return (result.data || []).map((item) => ({
    ...item,
    course: item.course
      ? {
          ...item.course,
          course_model: "mandiri",
          starts_at: null,
          ends_at: null,
          duration_weeks: null,
          session_count: null,
        }
      : item.course,
  }));
}

export async function getUserClasses(userId) {
  if (!userId) return [];
  const supabase = await createSupabaseServerClient();
  const modern = await getEnrollmentsModern(supabase, userId);

  if (!modern.error) {
    return modern.data;
  }

  return getEnrollmentsLegacy(supabase, userId);
}

export async function getDashboardOverview(userId) {
  const supabase = await createSupabaseServerClient();
  const enrollments = await getUserClasses(userId);

  let progress = [];
  const modernProgress = await supabase
    .from("course_unit_progress")
    .select("unit_id, completed_at")
    .eq("student_id", userId);

  if (!modernProgress.error) {
    progress = modernProgress.data || [];
  } else {
    const legacyProgress = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("student_id", userId);

    if (!legacyProgress.error) {
      progress = (legacyProgress.data || []).map((item) => ({
        unit_id: item.lesson_id,
        completed_at: item.completed_at,
      }));
    }
  }

  return {
    enrollments,
    progress,
  };
}

export async function getTodayQuizSummary(userId) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_quiz_attempts")
    .select("id, created_at, quiz:course_quizzes(id, title_id, course:courses(slug, title_id))")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    if (!isMissingSchemaError(error)) {
      console.error(error);
    }
    return [];
  }

  return data || [];
}

export async function getPublishedArticles() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, topic, excerpt, cover_image_url, published_at, author:profiles(full_name)")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (!isMissingSchemaError(error)) {
      console.error(error);
    }
    return [];
  }

  return data || [];
}

export async function getStudentPayments(userId) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_transactions")
    .select("order_id, amount_idr, transaction_status, payment_type, paid_at, created_at, course:courses(slug, title_id)")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function getCourseBySlugForUser(userId, slug) {
  const enrollments = await getUserClasses(userId);
  const match = enrollments.find((item) => item.course?.slug === slug);

  if (!match) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title_id, short_description_id, description_id, starts_at, ends_at, duration_weeks, session_count, live_platform")
    .eq("slug", slug)
    .maybeSingle();

  if (error && !isMissingSchemaError(error)) {
    console.error(error);
  }

  return {
    ...match,
    course: data || match.course,
  };
}
