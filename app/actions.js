"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildCallbackUrl, getSafeRedirect } from "@/lib/sso";
import { normalizeLanguage } from "@/lib/i18n";
import {
  buildWhatsappAuthEmail,
  looksLikeEmail,
  looksLikeWhatsapp,
  normalizeEmailIdentifier,
  normalizeWhatsappIdentifier,
} from "@/lib/auth-identifiers";
import { canBetaTest } from "@/lib/access";
import {
  buildOrderId,
  createMidtransSnapTransaction,
  getCourseCheckoutMode,
  isMidtransPaymentFailed,
  isMidtransPaymentPending,
  isMidtransPaymentSuccessful,
  persistPaymentRecord,
  resolveCoursePrice,
  syncMidtransTransactionStatus,
} from "@/lib/payments";
import { evaluateQuizResponse, normalizeQuizQuestion } from "@/lib/course-quizzes";
import {
  markStudyPlanCourseConverted,
} from "@/lib/study-plans";

export async function setLanguage(formData) {
  const language = normalizeLanguage(formData.get("language"));
  const next = getSafeRedirect(formData.get("next")?.toString() || "/");
  const cookieStore = await cookies();

  cookieStore.set("rabbani-language", language, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("profiles")
      .update({ preferred_language: language })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signIn(formData) {
  const identifier = formData.get("identifier")?.toString() || formData.get("email")?.toString() || "";
  const password = formData.get("password")?.toString();
  const next = getSafeRedirect(formData.get("next")?.toString() || "https://madrasah.rabbaniinstitute.id/beranda");
  const sanitizedIdentifier = identifier.trim();
  let email = normalizeEmailIdentifier(sanitizedIdentifier);

  if (!looksLikeEmail(sanitizedIdentifier)) {
    if (!looksLikeWhatsapp(sanitizedIdentifier)) {
      redirect(`/auth?error=${encodeURIComponent("Masukkan email atau nomor WhatsApp yang valid.")}&next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(identifier)}`);
    }

    email = await resolveEmailFromPhone(sanitizedIdentifier);
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(identifier)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(formData) {
  const fullName = formData.get("fullName")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();
  const birthYear = formData.get("birthYear")?.toString();
  const preferredLanguage = normalizeLanguage(formData.get("preferredLanguage"));
  const next = getSafeRedirect(formData.get("next")?.toString() || "https://madrasah.rabbaniinstitute.id/beranda");
  const supabase = await createSupabaseServerClient();

  if (password !== confirmPassword) {
    redirect(`/auth/register?error=${encodeURIComponent("Konfirmasi password belum sama.")}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
  }

  const parsedBirthYear = Number.parseInt(birthYear || "", 10);
  const currentYear = new Date().getFullYear();

  if (!Number.isFinite(parsedBirthYear) || parsedBirthYear < 1900 || parsedBirthYear > currentYear) {
    redirect(`/auth/register?error=${encodeURIComponent("Tahun lahir tidak valid.")}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
  }

  const { data: emailExists, error: emailExistsError } = await supabase.rpc("auth_email_exists", {
    target_email: email,
  });

  if (!shouldIgnoreMissingEmailCheckHook(emailExistsError) && emailExistsError) {
    redirect(`/auth/register?error=${encodeURIComponent(emailExistsError.message)}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
  }

  if (!emailExistsError && emailExists) {
    redirect(`/auth/forgot-password?method=email&identifier=${encodeURIComponent(email || "")}&message=${encodeURIComponent("Email ini sudah pernah didaftarkan. Silakan reset password untuk melanjutkan.")}&context=registered&next=${encodeURIComponent(next)}`);
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        preferred_language: preferredLanguage,
        birth_year: parsedBirthYear,
      },
      emailRedirectTo: buildCallbackUrl(next),
    },
  });

  if (error) {
    const shouldOfferForgotPassword = /already registered/i.test(error.message || "");
    if (shouldOfferForgotPassword) {
      redirect(`/auth/forgot-password?method=email&identifier=${encodeURIComponent(email || "")}&message=${encodeURIComponent("Email ini sudah pernah didaftarkan. Silakan reset password untuk melanjutkan.")}&context=registered&next=${encodeURIComponent(next)}`);
    }

    redirect(`/auth/register?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
  }

  revalidatePath("/", "layout");
  redirect(`/auth?message=${encodeURIComponent("Cek email Anda untuk mengonfirmasi akun.")}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
}

export async function requestPasswordReset(formData) {
  const identifier = formData.get("identifier")?.toString() || formData.get("email")?.toString() || "";
  const next = getSafeRedirect(formData.get("next")?.toString() || "https://madrasah.rabbaniinstitute.id/beranda");
  const email = normalizeEmailIdentifier(identifier);

  if (!looksLikeEmail(email)) {
    redirect(`/auth/forgot-password?error=${encodeURIComponent("Masukkan email akun yang valid, atau gunakan tab WhatsApp untuk reset via OTP.")}&identifier=${encodeURIComponent(identifier)}&method=${encodeURIComponent(looksLikeWhatsapp(identifier) ? "whatsapp" : "email")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildCallbackUrl("/auth/reset-password"),
  });

  if (error) {
    redirect(`/auth/forgot-password?error=${encodeURIComponent(error.message)}&identifier=${encodeURIComponent(email || "")}&method=email&next=${encodeURIComponent(next)}`);
  }

  redirect(`/auth/forgot-password?message=${encodeURIComponent("Kami sudah mengirim tautan reset password ke email Anda.")}&identifier=${encodeURIComponent(email || "")}&method=email&next=${encodeURIComponent(next)}`);
}

export async function updatePassword(formData) {
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();
  const next = getSafeRedirect(formData.get("next")?.toString() || "https://madrasah.rabbaniinstitute.id/beranda");
  const supabase = await createSupabaseServerClient();

  if (password !== confirmPassword) {
    redirect(`/auth/reset-password?error=${encodeURIComponent("Konfirmasi password belum sama.")}&next=${encodeURIComponent(next)}`);
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/auth?message=${encodeURIComponent("Password berhasil diperbarui. Silakan masuk.")}&next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth");
}



export async function enrollCourse(formData) {
  const courseId = Number(formData.get("courseId"));
  const courseSlug = formData.get("courseSlug")?.toString();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(`/courses/${courseSlug}`)}`);
  }

  const course = await getCourseForEnrollment(supabase, courseId);
  const { data: profile } = await supabase.from("profiles").select("is_beta_tester, role").eq("id", user.id).maybeSingle();
  const isBetaTester = canBetaTest(profile);

  if (!course || !["published", "beta"].includes(course.status)) {
    redirect(`/courses/${courseSlug}?error=${encodeURIComponent("Course belum tersedia untuk pendaftaran.")}`);
  }

  if (course.status === "beta" && !isBetaTester) {
    redirect(`/courses/${courseSlug}?error=${encodeURIComponent("Kelas beta hanya tersedia untuk akun beta tester.")}`);
  }

  if (
    course.course_model === "madrasah" &&
    course.enrollment_opens_at &&
    new Date(course.enrollment_opens_at).getTime() > Date.now()
  ) {
    redirect(`/courses/${courseSlug}?error=${encodeURIComponent("Pendaftaran belum dibuka.")}`);
  }

  const { error } = await supabase.from("enrollments").upsert(
    {
      course_id: courseId,
      student_id: user.id,
      status: "active",
    },
    { onConflict: "student_id,course_id" },
  );

  if (error) {
    redirect(`/courses/${courseSlug}?error=${encodeURIComponent(error.message)}`);
  }

  await markStudyPlanCourseConverted({
    userId: user.id,
    courseId,
  });

  redirect(`/learn/${courseSlug}`);
}

export async function startCourseCheckout(formData) {
  const courseId = Number(formData.get("courseId"));
  const courseSlug = formData.get("courseSlug")?.toString();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(`/courses/${courseSlug}`)}`);
  }

  const course = await getCourseForCheckout(supabase, courseId);
  const { data: profile } = await supabase.from("profiles").select("is_beta_tester, role").eq("id", user.id).maybeSingle();
  const isBetaTester = canBetaTest(profile);

  if (!course || !["published", "beta"].includes(course.status)) {
    redirect(`/courses/${courseSlug}?error=${encodeURIComponent("Kelas belum tersedia untuk checkout.")}`);
  }

  if (course.status === "beta" && !isBetaTester) {
    redirect(`/courses/${course.slug || courseSlug}?error=${encodeURIComponent("Kelas beta hanya tersedia untuk akun beta tester.")}`);
  }

  if (getCourseCheckoutMode(course, { isBetaTester }) === "free") {
    const cloned = new FormData();
    cloned.set("courseId", String(courseId));
    cloned.set("courseSlug", course.slug || courseSlug || "");
    return enrollCourse(cloned);
  }

  const amount = resolveCoursePrice(course);
  const paymentMethod = formData.get("paymentMethod")?.toString() || "snap";

  if (paymentMethod === "gopay" || paymentMethod === "qris") {
    redirect(`/pembayaran/proses?courseId=${courseId}`);
  }

  const orderId = buildOrderId({ courseId: course.id, userId: user.id });

  let transaction;

  try {
    transaction = await createMidtransSnapTransaction({
      orderId,
      amount,
      course,
      user,
    });
  } catch (error) {
    redirect(`/courses/${course.slug}?error=${encodeURIComponent(error.message || "Gagal membuat checkout Midtrans.")}`);
  }

  await persistPaymentRecord({
    order_id: orderId,
    course_id: course.id,
    student_id: user.id,
    amount_idr: amount,
    snap_token: transaction.token || null,
    snap_redirect_url: transaction.redirect_url || null,
    transaction_status: "pending",
    payment_type: null,
    status_code: "201",
    fraud_status: null,
    raw_payload: transaction,
    paid_at: null,
  });

  redirect(transaction.redirect_url);
}

export async function refreshMyPaymentStatus(formData) {
  const orderId = formData.get("orderId")?.toString() || "";
  const courseSlug = formData.get("courseSlug")?.toString() || "";
  const returnPath = formData.get("returnPath")?.toString() || "/payments";
  const safeReturnPath = getSafeRedirect(returnPath);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(safeReturnPath)}`);
  }

  if (!orderId) {
    redirect(appendQueryMessage(safeReturnPath, "error", "Order pembayaran tidak ditemukan."));
  }

  let syncResult;

  try {
    syncResult = await syncMidtransTransactionStatus({
      orderId,
      userId: user.id,
    });
  } catch (error) {
    redirect(appendQueryMessage(safeReturnPath, "error", error.message || "Gagal mengambil status terbaru dari Midtrans."));
  }

  revalidatePath("/payments");
  revalidatePath("/payments/pending");
  if (courseSlug) {
    revalidatePath(`/courses/${courseSlug}`);
  }

  redirect(appendQueryMessage(safeReturnPath, "message", describePaymentStatus(syncResult?.statusPayload?.transaction_status, {
    success: "Status pembayaran sudah sinkron. Akses kelas aktif.",
    pending: "Status terbaru dari Midtrans masih menunggu penyelesaian pembayaran.",
    failed: "Midtrans belum menandai pembayaran ini sebagai berhasil.",
    fallback: "Status pembayaran sudah diperbarui dari Midtrans.",
  })));
}

export async function refreshAdminPaymentStatus(formData) {
  const orderId = formData.get("orderId")?.toString() || "";
  const returnPath = formData.get("returnPath")?.toString() || "/payments";
  const safeReturnPath = getSafeRedirect(returnPath);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(safeReturnPath)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!["admin", "instructor"].includes(profile?.role || "")) {
    redirect(appendQueryMessage(safeReturnPath, "error", "Anda tidak memiliki akses untuk sinkronisasi pembayaran."));
  }

  if (!orderId) {
    redirect(appendQueryMessage(safeReturnPath, "error", "Order pembayaran tidak ditemukan."));
  }

  if (profile.role === "instructor") {
    const { data: visiblePayment } = await supabase
      .from("payment_transactions")
      .select("order_id, course:courses!inner(instructor_id)")
      .eq("order_id", orderId)
      .eq("course.instructor_id", user.id)
      .maybeSingle();

    if (!visiblePayment?.order_id) {
      redirect(appendQueryMessage(safeReturnPath, "error", "Pembayaran ini tidak berada di bawah kelas yang Anda kelola."));
    }
  }

  let syncResult;

  try {
    syncResult = await syncMidtransTransactionStatus({
      orderId,
      asAdmin: true,
    });
  } catch (error) {
    redirect(appendQueryMessage(safeReturnPath, "error", error.message || "Gagal mengambil status terbaru dari Midtrans."));
  }

  revalidatePath("/payments");
  revalidatePath("/payments/pending");
  if (syncResult?.course?.slug) {
    revalidatePath(`/courses/${syncResult.course.slug}`);
  }

  redirect(appendQueryMessage(safeReturnPath, "message", describePaymentStatus(syncResult?.statusPayload?.transaction_status, {
    success: `Status ${orderId} tersinkron dan akses kelas sudah/akan aktif otomatis.`,
    pending: `Status ${orderId} masih pending di Midtrans.`,
    failed: `Status ${orderId} belum berhasil di Midtrans.`,
    fallback: `Status ${orderId} berhasil diperbarui dari Midtrans.`,
  })));
}

export async function markUnitComplete(formData) {
  const unitId = Number(formData.get("unitId"));
  const courseSlug = formData.get("courseSlug")?.toString();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(`/learn/${courseSlug}`)}`);
  }

  const { error } = await supabase.from("course_unit_progress").upsert(
    {
      unit_id: unitId,
      student_id: user.id,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "student_id,unit_id" },
  );

  if (error) {
    redirect(`/learn/${courseSlug}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/learn/${courseSlug}`);
}

export async function submitCourseQuiz(formData) {
  const quizId = Number(formData.get("quizId"));
  const courseSlug = formData.get("courseSlug")?.toString() || "";
  const nextPath = `/learn/${courseSlug}/quizzes/${quizId}`;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }

  if (!quizId || !courseSlug) {
    redirect(`/learn/${courseSlug}?error=${encodeURIComponent("Kuis tidak valid.")}`);
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, status")
    .eq("slug", courseSlug)
    .eq("status", "published")
    .maybeSingle();

  if (courseError || !course) {
    redirect(`/learn/${courseSlug}?error=${encodeURIComponent("Course tidak ditemukan.")}`);
  }

  const { data: quiz, error: quizError } = await supabase
    .from("course_quizzes")
    .select("id, course_id, max_attempts, is_published")
    .eq("id", quizId)
    .eq("course_id", course.id)
    .eq("is_published", true)
    .maybeSingle();

  if (quizError || !quiz) {
    redirect(`${nextPath}?error=${encodeURIComponent("Kuis tidak ditemukan atau belum dipublikasikan.")}`);
  }

  const { data: questionRows, error: questionError } = await supabase
    .from("course_quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("sort_order", { ascending: true });

  if (questionError || !(questionRows || []).length) {
    redirect(`${nextPath}?error=${encodeURIComponent("Soal kuis belum tersedia.")}`);
  }

  const admin = createSupabaseAdminClient();

  if (!admin) {
    redirect(`${nextPath}?error=${encodeURIComponent("SUPABASE_SERVICE_ROLE_KEY belum tersedia di server.")}`);
  }

  const { data: attempts, error: attemptsError } = await admin
    .from("course_quiz_attempts")
    .select("attempt_number")
    .eq("quiz_id", quiz.id)
    .eq("student_id", user.id)
    .order("attempt_number", { ascending: false });

  if (attemptsError) {
    redirect(`${nextPath}?error=${encodeURIComponent(attemptsError.message)}`);
  }

  const attemptsUsed = attempts?.length || 0;

  if (attemptsUsed >= quiz.max_attempts) {
    redirect(`${nextPath}?error=${encodeURIComponent("Attempt kuis sudah habis.")}`);
  }

  const questions = (questionRows || []).map(normalizeQuizQuestion);
  const responseRows = questions.map((question) => {
    const response = readQuizResponseFromForm(formData, question);
    return {
      question_id: question.id,
      response,
      is_correct: evaluateQuizResponse(question, response),
    };
  });

  const answeredRows = responseRows.filter((row) => hasQuizResponse(row.response));
  const correctAnswers = responseRows.filter((row) => row.is_correct).length;
  const totalQuestions = questions.length;
  const scorePercent = totalQuestions ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2)) : 0;

  const { data: attempt, error: attemptInsertError } = await admin
    .from("course_quiz_attempts")
    .insert({
      quiz_id: quiz.id,
      student_id: user.id,
      attempt_number: attemptsUsed + 1,
      score_percent: scorePercent,
      correct_answers: correctAnswers,
      total_questions: totalQuestions,
    })
    .select("id")
    .single();

  if (attemptInsertError || !attempt) {
    redirect(`${nextPath}?error=${encodeURIComponent(attemptInsertError?.message || "Gagal menyimpan attempt kuis.")}`);
  }

  if (answeredRows.length) {
    const { error: answersInsertError } = await admin
      .from("course_quiz_attempt_answers")
      .insert(
        answeredRows.map((row) => ({
          attempt_id: attempt.id,
          question_id: row.question_id,
          response: row.response,
          is_correct: row.is_correct,
        })),
      );

    if (answersInsertError) {
      redirect(`${nextPath}?error=${encodeURIComponent(answersInsertError.message)}`);
    }
  }

  revalidatePath(nextPath);
  revalidatePath(`/learn/${course.slug}`);
  redirect(`${nextPath}?message=${encodeURIComponent("Kuis berhasil dikirim.")}`);
}

async function getCourseForEnrollment(supabase, courseId) {
  const modernResult = await supabase
    .from("courses")
    .select("id, status, course_model, enrollment_opens_at")
    .eq("id", courseId)
    .maybeSingle();

  if (!modernResult.error) {
    return modernResult.data;
  }

  if (!isMissingSchemaError(modernResult.error)) {
    console.error(modernResult.error);
    return null;
  }

  const legacyResult = await supabase
    .from("courses")
    .select("id, status")
    .eq("id", courseId)
    .maybeSingle();

  if (legacyResult.error) {
    console.error(legacyResult.error);
    return null;
  }

  return legacyResult.data
    ? {
        ...legacyResult.data,
        course_model: "mandiri",
        enrollment_opens_at: null,
      }
    : null;
}

async function getCourseForCheckout(supabase, courseId) {
  const modernResult = await supabase
    .from("courses")
    .select("id, slug, status, course_model, enrollment_opens_at, price_idr, title_id")
    .eq("id", courseId)
    .maybeSingle();

  if (!modernResult.error) {
    return modernResult.data;
  }

  if (!isMissingSchemaError(modernResult.error)) {
    console.error(modernResult.error);
    return null;
  }

  const legacyResult = await supabase
    .from("courses")
    .select("id, slug, status, title_id")
    .eq("id", courseId)
    .maybeSingle();

  if (legacyResult.error) {
    console.error(legacyResult.error);
    return null;
  }

  return legacyResult.data
    ? {
        ...legacyResult.data,
        course_model: "mandiri",
        enrollment_opens_at: null,
        price_idr: null,
      }
    : null;
}

function isMissingSchemaError(error) {
  const message = error?.message || "";
  return error?.code === "42703"
    || /does not exist/i.test(message)
    || /Could not find .* in the schema cache/i.test(message);
}

function shouldIgnoreMissingEmailCheckHook(error) {
  return /Could not find the function public\.auth_email_exists/i.test(error?.message || "");
}

async function resolveEmailFromPhone(rawPhone) {
  const normalizedPhone = normalizeWhatsappIdentifier(rawPhone);
  const admin = createSupabaseAdminClient();

  if (!admin || !normalizedPhone) {
    return buildWhatsappAuthEmail(normalizedPhone);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("phone_number", normalizedPhone)
    .maybeSingle();

  if (!profile?.id) {
    return buildWhatsappAuthEmail(normalizedPhone);
  }

  const { data: authData, error } = await admin.auth.admin.getUserById(profile.id);

  if (error || !authData?.user?.email) {
    return buildWhatsappAuthEmail(normalizedPhone);
  }

  return authData.user.email;
}

function readQuizResponseFromForm(formData, question) {
  const baseName = `question_${question.id}`;

  if (question.question_type === "multiple_choice") {
    return formData.getAll(baseName).map((item) => item.toString()).filter(Boolean);
  }

  if (question.question_type === "grid_single") {
    const response = {};

    for (const row of question.grid_rows || []) {
      const value = formData.get(`${baseName}_${row.key}`)?.toString();
      if (value) {
        response[row.key] = value;
      }
    }

    return response;
  }

  return formData.get(baseName)?.toString() || null;
}

function hasQuizResponse(response) {
  if (Array.isArray(response)) {
    return response.length > 0;
  }

  if (response && typeof response === "object") {
    return Object.keys(response).length > 0;
  }

  return Boolean(response);
}

function appendQueryMessage(path, key, value) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}

function describePaymentStatus(status, copy) {
  if (isMidtransPaymentSuccessful(status)) {
    return copy.success;
  }

  if (isMidtransPaymentPending(status)) {
    return copy.pending;
  }

  if (isMidtransPaymentFailed(status)) {
    return copy.failed;
  }

  return copy.fallback;
}
