import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const defaultSiteSettings = {
  contact_heading: "Hubungi Rabbani Institute melalui jalur resmi",
  contact_intro:
    "Gunakan kanal resmi Rabbani Institute untuk pertanyaan kelas, artikel, ujian, pembayaran, dan kendala akun.",
  contact_email: "admin@rabbaniinstitute.id",
  contact_whatsapp_label: "WhatsApp Admin",
  contact_whatsapp_number: "",
  contact_hours: "Senin - Sabtu, 08.00 - 17.00 WIB",
  contact_address: "Layanan digital Rabbani Institute",
  contact_notice:
    "Jangan kirim password atau kode OTP ke siapa pun. Admin hanya memerlukan informasi yang relevan untuk membantu akun atau layananmu.",
  floating_enabled: true,
  floating_label: "Butuh bantuan?",
  floating_whatsapp_number: "",
  floating_message: "Assalamu'alaikum, saya ingin bertanya tentang Rabbani Institute.",
};

function normalizeSiteSettings(row) {
  return {
    ...defaultSiteSettings,
    ...(row || {}),
    floating_enabled: row?.floating_enabled ?? defaultSiteSettings.floating_enabled,
  };
}

function isMissingSettingsSchema(error) {
  const message = error?.message || "";
  return (
    /does not exist/i.test(message)
    || /Could not find .* in the schema cache/i.test(message)
    || error?.code === "42P01"
    || error?.code === "42703"
  );
}

async function fetchPublicSiteSettings() {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (!isMissingSettingsSchema(error)) {
      console.error(error);
    }
    return normalizeSiteSettings(null);
  }

  return normalizeSiteSettings(data);
}

export async function getPublicSiteSettings() {
  const cached = unstable_cache(fetchPublicSiteSettings, ["public-site-settings"], {
    revalidate: 300,
    tags: ["site-settings"],
  });

  return cached();
}

export async function getSiteSettingsForAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (!isMissingSettingsSchema(error)) {
      console.error(error);
    }
    return {
      schemaReady: false,
      settings: normalizeSiteSettings(null),
    };
  }

  return {
    schemaReady: true,
    settings: normalizeSiteSettings(data),
  };
}
