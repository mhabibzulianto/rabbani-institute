"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

function isMissingRelation(error, relationName) {
  const message = error?.message || "";
  return (
    (relationName && new RegExp(relationName, "i").test(message) && /does not exist/i.test(message))
    || /Could not find .*schema cache/i.test(message)
    || error?.code === "42P01"
  );
}

function toNullableText(value) {
  const text = value?.toString().trim();
  return text ? text : null;
}

function toBirthYear(value) {
  const text = value?.toString().trim();
  if (!text) return null;
  const year = Number.parseInt(text, 10);
  return Number.isFinite(year) ? year : null;
}

export async function updateAccountProfile(formData) {
  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    full_name: toNullableText(formData.get("full_name")),
    bio: toNullableText(formData.get("bio")),
    birth_year: toBirthYear(formData.get("birth_year")),
    preferred_language: formData.get("preferred_language")?.toString() || "id",
  };

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  redirect("/profile?message=Profil berhasil diperbarui.");
}

export async function saveAccountAddress(formData) {
  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const addressId = formData.get("address_id")?.toString();
  const payload = {
    user_id: user.id,
    label: toNullableText(formData.get("label")),
    recipient_name: toNullableText(formData.get("recipient_name")),
    phone_number: toNullableText(formData.get("phone_number")),
    address_line1: toNullableText(formData.get("address_line1")),
    address_line2: toNullableText(formData.get("address_line2")),
    city: toNullableText(formData.get("city")),
    province: toNullableText(formData.get("province")),
    postal_code: toNullableText(formData.get("postal_code")),
    country_code: toNullableText(formData.get("country_code")) || "ID",
    is_primary: formData.get("is_primary") === "on",
  };

  const builder = addressId
    ? supabase.from("account_addresses").update(payload).eq("id", addressId).eq("user_id", user.id)
    : supabase.from("account_addresses").insert(payload);

  const { error } = await builder;

  if (error) {
    const message = isMissingRelation(error, "account_addresses")
      ? "Tabel alamat belum diaktifkan di database."
      : error.message;
    redirect(`/addresses?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/addresses");
  redirect("/addresses?message=Alamat berhasil disimpan.");
}

export async function deleteAccountAddress(formData) {
  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const addressId = formData.get("address_id")?.toString();
  if (!addressId) {
    redirect("/addresses?error=Alamat tidak ditemukan.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("account_addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) {
    const message = isMissingRelation(error, "account_addresses")
      ? "Tabel alamat belum diaktifkan di database."
      : error.message;
    redirect(`/addresses?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/addresses");
  redirect("/addresses?message=Alamat berhasil dihapus.");
}

export async function saveNotificationPreferences(formData) {
  const { user } = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    user_id: user.id,
    email_learning_updates: formData.get("email_learning_updates") === "on",
    email_payment_updates: formData.get("email_payment_updates") === "on",
    email_security_alerts: formData.get("email_security_alerts") === "on",
    whatsapp_learning_updates: formData.get("whatsapp_learning_updates") === "on",
    whatsapp_payment_updates: formData.get("whatsapp_payment_updates") === "on",
    whatsapp_security_alerts: formData.get("whatsapp_security_alerts") === "on",
  };

  const { error } = await supabase
    .from("account_notification_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    const message = isMissingRelation(error, "account_notification_preferences")
      ? "Tabel preferensi notifikasi belum diaktifkan di database."
      : error.message;
    redirect(`/account/notifications?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/account/notifications");
  redirect("/account/notifications?message=Preferensi notifikasi berhasil disimpan.");
}
