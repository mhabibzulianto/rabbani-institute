"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildCallbackUrl, getSafeRedirect } from "@/lib/auth";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

function textValue(formData, key) {
  const value = formData.get(key)?.toString().trim();
  return value ? value : null;
}

function yearValue(formData, key) {
  const raw = formData.get(key)?.toString().trim();
  if (!raw) return null;
  const year = Number.parseInt(raw, 10);
  return Number.isFinite(year) ? year : null;
}

export async function signIn(formData) {
  const identifier = textValue(formData, "identifier") || textValue(formData, "email") || "";
  const password = formData.get("password")?.toString() || "";
  const next = getSafeRedirect(formData.get("next")?.toString() || "/beranda");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: identifier.toLowerCase(),
    password,
  });

  if (error) {
    redirect(`/auth?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(identifier)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(formData) {
  const fullName = textValue(formData, "fullName");
  const email = textValue(formData, "email");
  const password = formData.get("password")?.toString() || "";
  const confirmPassword = formData.get("confirmPassword")?.toString() || "";
  const birthYear = yearValue(formData, "birthYear");
  const next = getSafeRedirect(formData.get("next")?.toString() || "/beranda");

  if (password !== confirmPassword) {
    redirect(`/auth/daftar?error=${encodeURIComponent("Konfirmasi password belum sama.")}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
  }

  if (!birthYear || birthYear < 1900 || birthYear > new Date().getFullYear()) {
    redirect(`/auth/daftar?error=${encodeURIComponent("Tahun lahir tidak valid.")}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        birth_year: birthYear,
        preferred_language: "id",
      },
      emailRedirectTo: buildCallbackUrl(next),
    },
  });

  if (error) {
    redirect(`/auth/daftar?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
  }

  revalidatePath("/", "layout");
  redirect(`/auth?message=${encodeURIComponent("Cek email Anda untuk mengonfirmasi akun.")}&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email || "")}`);
}

export async function requestPasswordReset(formData) {
  const email = textValue(formData, "identifier") || textValue(formData, "email") || "";
  const next = getSafeRedirect(formData.get("next")?.toString() || "/beranda");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
    redirectTo: buildCallbackUrl("/auth/reset-password"),
  });

  if (error) {
    redirect(`/auth/lupa?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(email)}`);
  }

  redirect(`/auth/lupa?message=${encodeURIComponent("Kami sudah mengirim tautan reset password ke email Anda.")}&next=${encodeURIComponent(next)}&identifier=${encodeURIComponent(email)}`);
}

export async function updatePassword(formData) {
  const password = formData.get("password")?.toString() || "";
  const confirmPassword = formData.get("confirmPassword")?.toString() || "";
  const next = getSafeRedirect(formData.get("next")?.toString() || "/beranda");

  if (password !== confirmPassword) {
    redirect(`/auth/reset-password?error=${encodeURIComponent("Konfirmasi password belum sama.")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/auth?message=${encodeURIComponent("Password berhasil diperbarui. Silakan masuk.")}&next=${encodeURIComponent(next)}`);
}

export async function updateOfficialProfile(formData) {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(getSafeRedirect("/administrasi-umum"))}`);
  }

  const supabase = await createSupabaseServerClient();
  const certificateName = textValue(formData, "certificate_name");
  const currentCertificateName = profile?.certificate_name || null;
  const certificateAlreadyChanged = Boolean(profile?.certificate_name_changed_at);

  if (
    certificateAlreadyChanged
    && currentCertificateName
    && certificateName
    && certificateName !== currentCertificateName
  ) {
    redirect("/administrasi-umum?error=Nama di sertifikat hanya dapat diubah satu kali.");
  }

  const payload = {
    certificate_name: certificateName,
    student_number: textValue(formData, "student_number"),
    gender: textValue(formData, "gender"),
    birth_year: yearValue(formData, "birth_year"),
  };

  if (!certificateAlreadyChanged && certificateName && certificateName !== currentCertificateName) {
    payload.certificate_name_changed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) {
    redirect(`/administrasi-umum?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/administrasi-umum");
  redirect("/administrasi-umum?message=Administrasi umum berhasil diperbarui.");
}

export async function submitIssueReport(formData) {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(getSafeRedirect("/laporkan-masalah"))}`);
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    user_id: user.id,
    category: textValue(formData, "category"),
    title: textValue(formData, "title"),
    description: textValue(formData, "description"),
    context_path: textValue(formData, "context_path"),
  };

  const { error } = await supabase
    .from("madrasah_issue_reports")
    .insert(payload);

  if (error) {
    redirect(`/laporkan-masalah?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/laporkan-masalah");
  redirect("/laporkan-masalah?message=Laporan berhasil dikirim. Tim kami akan menindaklanjuti.");
}
