import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localize } from "@/lib/data";

export function normalizeQuizQuestion(question) {
  return {
    ...question,
    question_type: question.question_type || "single_choice",
    option_list: Array.isArray(question.option_list) ? question.option_list : [],
    grid_rows: Array.isArray(question.grid_rows) ? question.grid_rows : [],
    grid_columns: Array.isArray(question.grid_columns) ? question.grid_columns : [],
  };
}

export function getQuizLabel(quiz, language = "id") {
  return localize(quiz, "title", language) || "Kuis";
}

export function getQuizInstructions(quiz, language = "id") {
  return localize(quiz, "instructions", language) || "";
}

export function evaluateQuizResponse(question, response) {
  const answerKey = question.answer_key;

  if (!answerKey) {
    return false;
  }

  if (question.question_type === "single_choice") {
    return typeof response === "string" && response === answerKey;
  }

  if (question.question_type === "multiple_choice") {
    const normalizedResponse = Array.isArray(response)
      ? [...new Set(response.map((item) => String(item).trim()).filter(Boolean))].sort()
      : [];
    const normalizedAnswer = Array.isArray(answerKey)
      ? [...new Set(answerKey.map((item) => String(item).trim()).filter(Boolean))].sort()
      : [];

    return JSON.stringify(normalizedResponse) === JSON.stringify(normalizedAnswer);
  }

  if (question.question_type === "grid_single") {
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return false;
    }

    const normalizedResponse = Object.fromEntries(
      Object.entries(response).map(([key, value]) => [String(key), String(value)]),
    );
    const normalizedAnswer = Object.fromEntries(
      Object.entries(answerKey || {}).map(([key, value]) => [String(key), String(value)]),
    );

    return JSON.stringify(normalizedResponse) === JSON.stringify(normalizedAnswer);
  }

  return false;
}

export async function getCourseQuizForLearner({ courseSlug, quizId, userId }) {
  const supabase = await createSupabaseServerClient();
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, title_id, title_ar, short_description_id, short_description_ar, course_model")
    .eq("slug", courseSlug)
    .eq("status", "published")
    .maybeSingle();

  if (courseError || !course) {
    return { course: null, quiz: null, questions: [], latestAttempt: null, attemptsUsed: 0 };
  }

  const { data: quiz, error: quizError } = await supabase
    .from("course_quizzes")
    .select("id, course_id, title_id, title_ar, instructions_id, instructions_ar, max_attempts, is_published, placement_after_sort_order")
    .eq("id", quizId)
    .eq("course_id", course.id)
    .eq("is_published", true)
    .maybeSingle();

  if (quizError || !quiz) {
    return { course, quiz: null, questions: [], latestAttempt: null, attemptsUsed: 0 };
  }

  const { data: questions, error: questionError } = await supabase
    .from("course_quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("sort_order", { ascending: true });

  if (questionError) {
    console.error(questionError);
  }

  const admin = createSupabaseAdminClient();

  if (!admin || !userId) {
    return {
      course,
      quiz,
      questions: (questions || []).map(normalizeQuizQuestion),
      latestAttempt: null,
      attemptsUsed: 0,
    };
  }

  const { data: attempts, error: attemptsError } = await admin
    .from("course_quiz_attempts")
    .select("id, attempt_number, submitted_at, score_percent, correct_answers, total_questions, created_at")
    .eq("quiz_id", quiz.id)
    .eq("student_id", userId)
    .order("attempt_number", { ascending: false });

  if (attemptsError) {
    console.error(attemptsError);
  }

  return {
    course,
    quiz,
    questions: (questions || []).map(normalizeQuizQuestion),
    latestAttempt: attempts?.[0] || null,
    attemptsUsed: attempts?.length || 0,
  };
}
