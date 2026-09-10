import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { normalizeWhatsappNumber } from "@/lib/exam-utils";

export async function POST(request) {
  try {
    const { examSlug, phone, code } = await request.json();
    const supabase = createSupabasePublicServerClient();
    const { data, error } = await supabase.rpc("exam_verify_otp", {
      p_exam_slug: examSlug,
      p_phone: normalizeWhatsappNumber(phone),
      p_code: String(code || ""),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Terjadi kesalahan saat memverifikasi OTP." }, { status: 500 });
  }
}
