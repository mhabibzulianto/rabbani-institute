import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { formatWibDate, formatWibDateTime } from "@/lib/wib";

export function minutesToLabel(minutes) {
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

export function localize(row, field, language) {
  return row?.[`${field}_${language}`] || row?.[`${field}_id`] || "";
}

export function getCourseModelLabel(model) {
  return model === "madrasah" ? "Kelas Madrasah" : "Kelas Mandiri";
}

export function getMandiriCompletionTime(minutes, language = "id") {
  const weeklyMinutes = 10 * 60;
  const estimatedWeeks = Math.max(1, Math.ceil((minutes || 0) / weeklyMinutes));

  if (estimatedWeeks < 4) {
    return formatDurationUnit(estimatedWeeks, "week", language);
  }

  const estimatedMonths = Math.max(1, Math.ceil(estimatedWeeks / 4));
  return formatDurationUnit(estimatedMonths, "month", language);
}

export function getMadrasahDurationLabel(course, language = "id") {
  const explicitWeeks = Number(course?.duration_weeks || 0);

  if (explicitWeeks > 0) {
    return formatDurationUnit(explicitWeeks, "week", language);
  }

  const startsAt = course?.starts_at ? new Date(course.starts_at) : null;
  const endsAt = course?.ends_at ? new Date(course.ends_at) : null;

  if (startsAt && endsAt) {
    const diffMs = endsAt.getTime() - startsAt.getTime();
    const computedWeeks = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
    return formatDurationUnit(computedWeeks, "week", language);
  }

  return formatDurationUnit(1, "week", language);
}

export function getDeliveryModeLabel(mode) {
  if (mode === "synchronous") {
    return "Synchronous";
  }

  if (mode === "asynchronous") {
    return "Asynchronous";
  }

  return "-";
}

export function getLivePlatformLabel(platform) {
  switch (platform) {
    case "zoom":
      return "Zoom";
    case "google-meet":
      return "Google Meet";
    case "teams":
      return "Microsoft Teams";
    default:
      return "-";
  }
}

export function getMadrasahSessionCount(course, units = []) {
  const explicitCount = Number(course?.session_count || 0);

  if (explicitCount > 0) {
    return explicitCount;
  }

  return Array.isArray(units) ? units.length : 0;
}

export function getUnitTerm(courseModel, count = 1) {
  const base = courseModel === "madrasah" ? "sesi" : "modul";
  return count === 1 ? base : base;
}

export function getUnitKindLabel(unitKind) {
  return unitKind === "session" ? "Sesi" : "Modul";
}

export function getContentTypeLabel(contentType) {
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

export function formatDate(value, locale = "id-ID") {
  return formatWibDate(value, locale);
}

export function formatDateTime(value, locale = "id-ID") {
  return formatWibDateTime(value, locale);
}

export function formatIdr(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getMadrasahStatus(course, now = new Date()) {
  if (course.course_model !== "madrasah") {
    return null;
  }

  const startsAt = course.starts_at ? new Date(course.starts_at) : null;
  const endsAt = course.ends_at ? new Date(course.ends_at) : null;

  if (startsAt && now < startsAt) {
    return "Akan datang";
  }

  if (startsAt && endsAt && now >= startsAt && now <= endsAt) {
    return "Sedang berjalan";
  }

  if (endsAt && now > endsAt) {
    return "Selesai";
  }

  return "Belum dijadwalkan";
}

function getCourseSelect() {
  return [
    "id",
    "status",
    "slug",
    "title_id",
    "title_ar",
    "short_description_id",
    "short_description_ar",
    "description_id",
    "description_ar",
    "goals_id",
    "goals_ar",
    "level",
    "duration_minutes",
    "featured",
    "thumbnail_url",
    "course_model",
    "delivery_mode",
    "enrollment_opens_at",
    "enrollment_closes_at",
    "starts_at",
    "ends_at",
    "duration_weeks",
    "session_count",
    "live_platform",
    "live_meeting_url",
    "price_idr",
  ].join(", ");
}

function getLegacyCourseSelect() {
  return [
    "id",
    "status",
    "slug",
    "title_id",
    "title_ar",
    "short_description_id",
    "short_description_ar",
    "description_id",
    "description_ar",
    "goals_id",
    "goals_ar",
    "level",
    "duration_minutes",
    "duration_weeks",
    "featured",
    "thumbnail_url",
    "price_idr",
  ].join(", ");
}

function getCourseUnitSelect() {
  return [
    "id",
    "sort_order",
    "unit_kind",
    "title_id",
    "title_ar",
    "content_type",
    "body_id",
    "body_ar",
    "video_url",
    "meeting_url",
    "meeting_platform",
    "scheduled_start_at",
    "scheduled_end_at",
    "recording_url",
    "duration_minutes",
    "is_preview",
  ].join(", ");
}

function getCourseQuizSelect() {
  return [
    "id",
    "course_id",
    "placement_after_sort_order",
    "title_id",
    "title_ar",
    "instructions_id",
    "instructions_ar",
    "max_attempts",
    "is_published",
  ].join(", ");
}

function getLegacyLessonSelect() {
  return [
    "id",
    "sort_order",
    "title_id",
    "title_ar",
    "content_type",
    "body_id",
    "body_ar",
    "video_url",
    "duration_minutes",
    "is_preview",
  ].join(", ");
}

function isMissingSchemaError(error) {
  const message = error?.message || "";
  return error?.code === "42703"
    || /does not exist/i.test(message)
    || /Could not find .* in the schema cache/i.test(message);
}

function isCourseStatusEnumError(error) {
  return /invalid input value for enum course_status/i.test(error?.message || "");
}

function normalizeLegacyCourse(course) {
  if (!course) {
    return course;
  }

  return {
    ...course,
    course_model: course.course_model || "mandiri",
    delivery_mode: course.delivery_mode || null,
    enrollment_opens_at: course.enrollment_opens_at || null,
    enrollment_closes_at: course.enrollment_closes_at || null,
    starts_at: course.starts_at || null,
    ends_at: course.ends_at || null,
    duration_weeks: course.duration_weeks || null,
    session_count: course.session_count || null,
    live_platform: course.live_platform || null,
    live_meeting_url: course.live_meeting_url || null,
    goals_id: course.goals_id || null,
    goals_ar: course.goals_ar || null,
    enrollment_count: Number(course.enrollment_count || 0),
    rating_value: course.rating_value || null,
  };
}

async function attachCourseStats(client, courses) {
  const courseIds = (courses || []).map((course) => course.id).filter(Boolean);

  if (courseIds.length === 0) {
    return courses || [];
  }

  const { data: enrollments, error } = await client
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .in("status", ["active", "completed"]);

  if (error) {
    console.error(error);
    return (courses || []).map((course) => ({
      ...course,
      enrollment_count: Number(course.enrollment_count || 0),
      rating_value: course.rating_value || null,
    }));
  }

  const counts = new Map();

  for (const enrollment of enrollments || []) {
    counts.set(enrollment.course_id, (counts.get(enrollment.course_id) || 0) + 1);
  }

  return (courses || []).map((course) => ({
    ...course,
    enrollment_count: counts.get(course.id) || 0,
    rating_value: course.rating_value || null,
  }));
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

async function fetchPublishedCourses(client) {
  const modernSelect = `${getCourseSelect()}, category:categories(id, slug, title_id, title_ar)`;
  let modernResult = await client
    .from("courses")
    .select(modernSelect)
    .in("status", ["published", "beta"])
    .order("featured", { ascending: false })
    .order("created_at", { ascending: true });

  if (isCourseStatusEnumError(modernResult.error)) {
    modernResult = await client
      .from("courses")
      .select(modernSelect)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: true });
  }

  if (!modernResult.error) {
    return attachCourseStats(client, modernResult.data || []);
  }

  if (!isMissingSchemaError(modernResult.error)) {
    console.error(modernResult.error);
    return [];
  }

  let legacyResult = await client
    .from("courses")
    .select(`${getLegacyCourseSelect()}, category:categories(id, slug, title_id, title_ar)`)
    .in("status", ["published", "beta"])
    .order("featured", { ascending: false })
    .order("created_at", { ascending: true });

  if (isCourseStatusEnumError(legacyResult.error)) {
    legacyResult = await client
      .from("courses")
      .select(`${getLegacyCourseSelect()}, category:categories(id, slug, title_id, title_ar)`)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: true });
  }

  if (legacyResult.error) {
    console.error(legacyResult.error);
    return [];
  }

  return attachCourseStats(
    client,
    (legacyResult.data || []).map(normalizeLegacyCourse),
  );
}

async function fetchCourseUnits(client, courseId) {
  const modernResult = await client
    .from("course_units")
    .select(getCourseUnitSelect())
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (!modernResult.error) {
    return modernResult.data || [];
  }

  const legacyResult = await client
    .from("lessons")
    .select(getLegacyLessonSelect())
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (legacyResult.error) {
    console.error(legacyResult.error);
    return [];
  }

  return (legacyResult.data || []).map(normalizeLegacyUnit);
}

async function fetchCourseDocuments(client, courseId) {
  const { data, error } = await client
    .from("course_documents")
    .select("*")
    .eq("course_id", courseId)
    .order("unit_sort_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error) || /course_documents/i.test(error?.message || "")) {
      return [];
    }

    console.error(error);
    return [];
  }

  return data || [];
}

async function fetchCourseQuizzes(client, courseId) {
  const [{ data: quizzes, error: quizzesError }, { data: questions, error: questionsError }] = await Promise.all([
    client
      .from("course_quizzes")
      .select(getCourseQuizSelect())
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("placement_after_sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    client
      .from("course_quiz_questions")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  if (quizzesError) {
    if (isMissingSchemaError(quizzesError) || /course_quizzes|course_quiz_questions/i.test(quizzesError?.message || "")) {
      return [];
    }

    console.error(quizzesError);
    return [];
  }

  if (questionsError) {
    console.error(questionsError);
  }

  const questionMap = (questions || []).reduce((map, question) => {
    const current = map.get(question.quiz_id) || [];
    current.push(question);
    map.set(question.quiz_id, current);
    return map;
  }, new Map());

  return (quizzes || []).map((quiz) => ({
    ...quiz,
    questions: questionMap.get(quiz.id) || [],
  }));
}

async function fetchCourseBySlug(client, slug, publicOnly = false, includeLearningContent = false) {
  const modernSelect = `${getCourseSelect()}, instructor:profiles(id, full_name), category:categories(id, slug, title_id, title_ar)`;
  let modernResult = await (publicOnly
    ? client
        .from("courses")
        .select(modernSelect)
        .eq("slug", slug)
        .in("status", ["published", "beta"])
        .maybeSingle()
    : client
        .from("courses")
        .select(modernSelect)
        .eq("slug", slug)
        .maybeSingle());

  if (publicOnly && isCourseStatusEnumError(modernResult.error)) {
    modernResult = await client
      .from("courses")
      .select(modernSelect)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
  }

  if (!modernResult.error && modernResult.data) {
    const units = await fetchCourseUnits(client, modernResult.data.id);
    const [documents, quizzes] = includeLearningContent
      ? await Promise.all([
          fetchCourseDocuments(client, modernResult.data.id),
          fetchCourseQuizzes(client, modernResult.data.id),
        ])
      : [[], []];
    return {
      ...modernResult.data,
      units,
      documents,
      quizzes,
    };
  }

  if (modernResult.error && !isMissingSchemaError(modernResult.error)) {
    console.error(modernResult.error);
    return null;
  }

  const legacySelect = `${getLegacyCourseSelect()}, instructor:profiles(id, full_name), category:categories(id, slug, title_id, title_ar)`;
  let legacyResult = await (publicOnly
    ? client
        .from("courses")
        .select(legacySelect)
        .eq("slug", slug)
        .in("status", ["published", "beta"])
        .maybeSingle()
    : client
        .from("courses")
        .select(legacySelect)
        .eq("slug", slug)
        .maybeSingle());

  if (publicOnly && isCourseStatusEnumError(legacyResult.error)) {
    legacyResult = await client
      .from("courses")
      .select(legacySelect)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
  }

  if (legacyResult.error || !legacyResult.data) {
    if (legacyResult.error) {
      console.error(legacyResult.error);
    }
    return null;
  }

  const units = await fetchCourseUnits(client, legacyResult.data.id);
  const [documents, quizzes] = includeLearningContent
    ? await Promise.all([
        fetchCourseDocuments(client, legacyResult.data.id),
        fetchCourseQuizzes(client, legacyResult.data.id),
      ])
    : [[], []];
  return {
    ...normalizeLegacyCourse(legacyResult.data),
    units,
    documents,
    quizzes,
  };
}

export async function getPublishedCourses() {
  const supabase = await createSupabaseServerClient();
  return fetchPublishedCourses(supabase);
}

const getPublishedCoursesCached = unstable_cache(
  async () => {
    const supabase = createSupabasePublicClient();
    return fetchPublishedCourses(supabase);
  },
  ["public-published-courses"],
  { revalidate: 300 },
);

export async function getPublishedCoursesPublic() {
  return getPublishedCoursesCached();
}

export async function getCourseBySlug(slug) {
  const supabase = await createSupabaseServerClient();
  return fetchCourseBySlug(supabase, slug, true, true);
}

export async function getPublicCourseBySlug(slug) {
  const getCachedCourse = unstable_cache(
    async () => {
      const supabase = createSupabasePublicClient();
      return fetchCourseBySlug(supabase, slug, true, false);
    },
    [`public-course-${slug}`],
    { revalidate: 300 },
  );

  return getCachedCourse();
}

export async function getDashboardData(userId) {
  if (!userId) {
    return { enrollments: [], progress: [] };
  }

  const supabase = await createSupabaseServerClient();
  let enrollments = [];
  const modernEnrollments = await supabase
    .from("enrollments")
    .select(
      `id, status, enrolled_at, course:courses(${getCourseSelect()}, course_units(id))`,
    )
    .eq("student_id", userId)
    .order("enrolled_at", { ascending: false });

  if (!modernEnrollments.error) {
    enrollments = modernEnrollments.data || [];
  } else {
    const legacyEnrollments = await supabase
      .from("enrollments")
      .select(
        `id, status, enrolled_at, course:courses(${getLegacyCourseSelect()}, lessons(id))`,
      )
      .eq("student_id", userId)
      .order("enrolled_at", { ascending: false });

    if (legacyEnrollments.error) {
      console.error(legacyEnrollments.error);
    } else {
      enrollments = (legacyEnrollments.data || []).map((enrollment) => ({
        ...enrollment,
        course: enrollment.course
          ? {
              ...normalizeLegacyCourse(enrollment.course),
              course_units: enrollment.course.lessons || [],
            }
          : enrollment.course,
      }));
    }
  }

  let progress = [];
  const modernProgress = await supabase
    .from("course_unit_progress")
    .select("unit_id, completed_at, unit:course_units(id, course_id)")
    .eq("student_id", userId);

  if (!modernProgress.error) {
    progress = modernProgress.data || [];
  } else {
    const legacyProgress = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed_at, lesson:lessons(id, course_id)")
      .eq("student_id", userId);

    if (legacyProgress.error) {
      console.error(legacyProgress.error);
    } else {
      progress = (legacyProgress.data || []).map((item) => ({
        unit_id: item.lesson_id,
        completed_at: item.completed_at,
        unit: item.lesson,
      }));
    }
  }

  return {
    enrollments,
    progress,
  };
}

export async function getLearningCourse(slug, userId) {
  const course = await getCourseBySlug(slug);
  if (!course || !userId) {
    return { course, progress: [] };
  }

  const supabase = await createSupabaseServerClient();
  const { data: progress } = await supabase
    .from("course_unit_progress")
    .select("unit_id, completed_at, last_position_seconds")
    .eq("student_id", userId);

  return { course, progress: progress || [] };
}

function formatDurationUnit(value, unit, language) {
  if (language === "ar") {
    if (unit === "month") {
      return value === 1 ? "شهر واحد" : `${value} أشهر`;
    }

    return value === 1 ? "أسبوع واحد" : `${value} أسابيع`;
  }

  if (unit === "month") {
    return `${value} bulan`;
  }

  return `${value} minggu`;
}
