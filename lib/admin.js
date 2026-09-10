import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { canAuthorArticles } from "@/lib/access";

function getAdminCourseSelect() {
  return [
    "id",
    "slug",
    "status",
    "review_status",
    "title_id",
    "title_ar",
    "level",
    "duration_minutes",
    "featured",
    "published_at",
    "review_submitted_at",
    "last_reviewed_at",
    "updated_at",
    "instructor_id",
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
  ].join(", ");
}

function getLegacyAdminCourseSelect() {
  return [
    "id",
    "slug",
    "status",
    "review_status",
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
    "published_at",
    "review_submitted_at",
    "last_reviewed_at",
    "updated_at",
    "instructor_id",
  ].join(", ");
}

function isMissingSchemaError(error) {
  return error?.code === "42703" || /does not exist/i.test(error?.message || "");
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
  };
}

export async function requireAdmin() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/auth?next=/studio");
  }

  if (profile?.role !== "admin") {
    redirect("/studio");
  }

  return { user, profile };
}

export async function requireStaff() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/auth?next=/studio");
  }

  if (!["admin", "instructor"].includes(profile?.role)) {
    redirect("/studio");
  }

  return { user, profile };
}

export async function requireAuthor() {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/auth?next=/studio/articles");
  }

  if (!canAuthorArticles(profile)) {
    redirect("/studio");
  }

  return { user, profile };
}

export async function getAdminOverview() {
  const { user, profile } = await requireStaff();
  const supabase = await createSupabaseServerClient();
  const isAdmin = profile.role === "admin";

  const [
    { count: totalUsers },
    { data: roles },
    { data: courses },
    { count: pendingReviews },
    { count: changesRequested },
    { count: totalEnrollments },
    { count: completedUnits },
  ] = await Promise.all([
    isAdmin
      ? supabase.from("profiles").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0 }),
    isAdmin ? supabase.from("profiles").select("role") : Promise.resolve({ data: [] }),
    isAdmin
      ? supabase.from("courses").select("status, featured")
      : supabase.from("courses").select("status, featured").eq("instructor_id", user.id),
    isAdmin
      ? supabase.from("courses").select("id", { count: "exact", head: true }).eq("review_status", "in_review")
      : supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("instructor_id", user.id)
          .eq("review_status", "in_review"),
    isAdmin
      ? supabase.from("courses").select("id", { count: "exact", head: true }).eq("review_status", "changes_requested")
      : supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("instructor_id", user.id)
          .eq("review_status", "changes_requested"),
    isAdmin
      ? supabase.from("enrollments").select("id", { count: "exact", head: true })
      : supabase
          .from("enrollments")
          .select("id, course:courses!inner(instructor_id)", { count: "exact", head: true })
          .eq("course.instructor_id", user.id),
    supabase.from("course_unit_progress").select("id", { count: "exact", head: true }).not("completed_at", "is", null),
  ]);

  const roleCounts = countBy(roles || [], "role");
  const courseCounts = countBy(courses || [], "status");
  const featuredCourses = (courses || []).filter((course) => course.featured).length;

  return {
    totalUsers: totalUsers || 0,
    students: roleCounts.student || 0,
    instructors: roleCounts.instructor || 0,
    admins: roleCounts.admin || 0,
    publishedCourses: courseCounts.published || 0,
    draftCourses: courseCounts.draft || 0,
    archivedCourses: courseCounts.archived || 0,
    featuredCourses,
    pendingReviews: pendingReviews || 0,
    changesRequested: changesRequested || 0,
    totalEnrollments: totalEnrollments || 0,
    completedUnits: completedUnits || 0,
    isAdmin,
  };
}

export async function getAdminUsers() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, is_writer, is_beta_tester, full_name, preferred_language, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function getAdminCourses() {
  const { user, profile } = await requireStaff();
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("courses")
    .select(
      `${getAdminCourseSelect()}, category:categories(id, slug, title_id), instructor:profiles(id, full_name)`,
    )
    .order("updated_at", { ascending: false });

  if (profile.role !== "admin") {
    query = query.eq("instructor_id", user.id);
  }

  const { data, error } = await query;

  if (!error) {
    return data || [];
  }

  if (!isMissingSchemaError(error)) {
    console.error(error);
    return [];
  }

  let legacyQuery = supabase
    .from("courses")
    .select(
      `${getLegacyAdminCourseSelect()}, category:categories(id, slug, title_id), instructor:profiles(id, full_name)`,
    )
    .order("updated_at", { ascending: false });

  if (profile.role !== "admin") {
    legacyQuery = legacyQuery.eq("instructor_id", user.id);
  }

  const { data: legacyData, error: legacyError } = await legacyQuery;

  if (legacyError) {
    console.error(legacyError);
    return [];
  }

  return (legacyData || []).map(normalizeLegacyCourse);
}

export async function getCourseEditorOptions() {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: instructors }] = await Promise.all([
    supabase.from("categories").select("id, slug, title_id, title_ar").order("sort_order", { ascending: true }),
    supabase.from("profiles").select("id, full_name, role").in("role", ["admin", "instructor"]).order("full_name"),
  ]);

  return {
    categories: categories || [],
    instructors: instructors || [],
  };
}

export async function getCourseForEdit(courseId) {
  const { user, profile } = await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();

  if (error || !data) {
    redirect("/studio/courses?error=Course%20not%20found");
  }

  if (profile.role !== "admin" && data.instructor_id !== user.id) {
    redirect("/studio/courses?error=You%20can%20only%20edit%20your%20own%20courses");
  }

  return { course: normalizeLegacyCourse(data), user, profile };
}

export async function getCourseReviewEvents(courseId) {
  await getCourseForEdit(courseId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_review_events")
    .select("id, action, note, created_at, actor:profiles(id, full_name)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function getCourseUnitsForEdit(courseId) {
  const { course } = await getCourseForEdit(courseId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_units")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (!error) {
    return data || [];
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (legacyError) {
    console.error(legacyError);
    return [];
  }

  return (legacyData || []).map((unit) => ({
    ...unit,
    unit_kind: course.course_model === "madrasah" ? "session" : "module",
    meeting_url: null,
    meeting_platform: null,
    scheduled_start_at: unit.scheduled_start_at || null,
    scheduled_end_at: unit.scheduled_end_at || null,
    recording_url: unit.recording_url || null,
  }));
}

export async function getCourseDocumentsForEdit(courseId) {
  await getCourseForEdit(courseId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_documents")
    .select("*")
    .eq("course_id", courseId)
    .order("unit_sort_order", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error) || /course_documents/i.test(error?.message || "")) {
      return { schemaReady: false, documents: [] };
    }

    console.error(error);
    return { schemaReady: true, documents: [] };
  }

  return { schemaReady: true, documents: data || [] };
}

export async function getCourseQuizzesForEdit(courseId) {
  await getCourseForEdit(courseId);
  const supabase = await createSupabaseServerClient();
  const [{ data: quizzes, error: quizzesError }, { data: questions, error: questionsError }] = await Promise.all([
    supabase
      .from("course_quizzes")
      .select("*")
      .eq("course_id", courseId)
      .order("placement_after_sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("course_quiz_questions")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  if (quizzesError) {
    if (isMissingSchemaError(quizzesError) || /course_quizzes|course_quiz_questions/i.test(quizzesError?.message || "")) {
      return { schemaReady: false, quizzes: [] };
    }

    console.error(quizzesError);
    return { schemaReady: true, quizzes: [] };
  }

  if (questionsError) {
    console.error(questionsError);
  }

  const questionMap = (questions || []).reduce((map, question) => {
    const list = map.get(question.quiz_id) || [];
    list.push(question);
    map.set(question.quiz_id, list);
    return map;
  }, new Map());

  return {
    schemaReady: true,
    quizzes: (quizzes || []).map((quiz) => ({
      ...quiz,
      questions: questionMap.get(quiz.id) || [],
    })),
  };
}

export async function getInstructorDashboard(userId) {
  const supabase = await createSupabaseServerClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, slug, title_id, short_description_id, description_id, status, review_status, review_submitted_at, last_reviewed_at, updated_at, course_model, delivery_mode, enrollment_opens_at, enrollment_closes_at, starts_at, ends_at, duration_weeks, session_count, live_platform")
    .eq("instructor_id", userId)
    .order("updated_at", { ascending: false });

  if (!error) {
    return courses || [];
  }

  if (!isMissingSchemaError(error)) {
    console.error(error);
    return [];
  }

  const { data: legacyCourses, error: legacyError } = await supabase
    .from("courses")
    .select("id, slug, title_id, short_description_id, description_id, status, review_status, review_submitted_at, last_reviewed_at, updated_at")
    .eq("instructor_id", userId)
    .order("updated_at", { ascending: false });

  if (legacyError) {
    console.error(legacyError);
    return [];
  }

  return (legacyCourses || []).map(normalizeLegacyCourse);
}

export async function getAdminCategories() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function getReviewEventFeedForCourses(courseIds) {
  if (!courseIds.length) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_review_events")
    .select("id, course_id, action, note, created_at, actor:profiles(id, full_name)")
    .in("course_id", courseIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function getAdminExams() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exam_modules")
    .select("id, slug, title, subtitle, opens_at, closes_at, duration_minutes, max_attempts, is_published, created_at, updated_at")
    .order("opens_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error) || /exam_modules/i.test(error?.message || "")) {
      return { schemaReady: false, exams: [] };
    }

    console.error(error);
    return { schemaReady: true, exams: [] };
  }

  return { schemaReady: true, exams: data || [] };
}

export async function getExamForEdit(examId) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [{ data: exam, error: examError }, { data: phones, error: phonesError }, { data: questions, error: questionsError }, { data: attempts }] = await Promise.all([
    supabase
      .from("exam_modules")
      .select("*")
      .eq("id", examId)
      .maybeSingle(),
    supabase
      .from("exam_allowed_phones")
      .select("id, phone")
      .eq("exam_id", examId)
      .order("phone", { ascending: true }),
    supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", examId),
  ]);

  if (examError) {
    if (isMissingSchemaError(examError) || /exam_modules/i.test(examError?.message || "")) {
      return { schemaReady: false, exam: null, questions: [], attemptsCount: 0 };
    }

    redirect("/studio/exams?error=Exam%20not%20found");
  }

  if (!exam) {
    redirect("/studio/exams?error=Exam%20not%20found");
  }

  if (phonesError) {
    console.error(phonesError);
  }

  if (questionsError) {
    console.error(questionsError);
  }

  return {
    schemaReady: true,
    exam: {
      ...exam,
      allowed_phones: phones || [],
    },
    questions: questions || [],
    attemptsCount: attempts?.count || 0,
  };
}

export async function getExamOverviewMetrics() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [{ count: activeExams }, { count: totalAttempts }, { count: submittedAttempts }] = await Promise.all([
    supabase
      .from("exam_modules")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
  ]);

  return {
    activeExams: activeExams || 0,
    totalAttempts: totalAttempts || 0,
    submittedAttempts: submittedAttempts || 0,
  };
}

export async function getExamResultsForAdmin(examId) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [
    { data: exam, error: examError },
    { data: attempts, error: attemptsError },
    { data: answers, error: answersError },
  ] = await Promise.all([
    supabase
      .from("exam_modules")
      .select("id, slug, title, subtitle, opens_at, closes_at, duration_minutes, max_attempts, is_published")
      .eq("id", examId)
      .maybeSingle(),
    supabase
      .from("exam_attempts")
      .select("id, participant_phone, attempt_number, status, started_at, expires_at, submitted_at, score_percent, correct_answers, total_questions, created_at")
      .eq("exam_id", examId)
      .order("created_at", { ascending: false }),
    supabase
      .from("exam_attempt_answers")
      .select("attempt_id, is_correct"),
  ]);

  if (examError) {
    if (isMissingSchemaError(examError) || /exam_modules/i.test(examError?.message || "")) {
      return { schemaReady: false, exam: null, attempts: [], participantCount: 0, submittedCount: 0 };
    }

    redirect("/studio/exams?error=Exam%20not%20found");
  }

  if (!exam) {
    redirect("/studio/exams?error=Exam%20not%20found");
  }

  if (attemptsError) {
    console.error(attemptsError);
  }

  if (answersError) {
    console.error(answersError);
  }

  const answerStats = new Map();
  for (const answer of answers || []) {
    const current = answerStats.get(answer.attempt_id) || { answeredCount: 0, locallyCorrectCount: 0 };
    current.answeredCount += 1;
    if (answer.is_correct) {
      current.locallyCorrectCount += 1;
    }
    answerStats.set(answer.attempt_id, current);
  }

  const normalizedAttempts = (attempts || []).map((attempt) => {
    const stats = answerStats.get(attempt.id) || { answeredCount: 0, locallyCorrectCount: 0 };
    return {
      ...attempt,
      answered_count: stats.answeredCount,
      locally_correct_count: stats.locallyCorrectCount,
    };
  });

  const participantCount = new Set(normalizedAttempts.map((attempt) => attempt.participant_phone)).size;
  const submittedCount = normalizedAttempts.filter((attempt) => attempt.submitted_at).length;

  return {
    schemaReady: true,
    exam,
    attempts: normalizedAttempts,
    participantCount,
    submittedCount,
  };
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

