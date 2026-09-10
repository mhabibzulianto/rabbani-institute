import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildWhatsappAuthEmail,
  looksLikeEmail,
  looksLikeWhatsapp,
  normalizeEmailIdentifier,
  normalizeWhatsappIdentifier,
} from "@/lib/auth-identifiers";

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier || "").trim();

    if (!identifier) {
      return NextResponse.json({ error: "Email atau nomor WhatsApp wajib diisi." }, { status: 400 });
    }

    if (looksLikeEmail(identifier)) {
      return NextResponse.json({
        success: true,
        email: normalizeEmailIdentifier(identifier),
      });
    }

    if (!looksLikeWhatsapp(identifier)) {
      return NextResponse.json({ error: "Masukkan email atau nomor WhatsApp yang valid." }, { status: 400 });
    }

    const normalizedPhone = normalizeWhatsappIdentifier(identifier);
    const admin = createSupabaseAdminClient();

    if (!admin) {
      return NextResponse.json({
        success: true,
        email: buildWhatsappAuthEmail(normalizedPhone),
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone_number", normalizedPhone)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json({
        success: true,
        email: buildWhatsappAuthEmail(normalizedPhone),
      });
    }

    const { data: authData, error } = await admin.auth.admin.getUserById(profile.id);

    if (error || !authData?.user?.email) {
      return NextResponse.json({
        success: true,
        email: buildWhatsappAuthEmail(normalizedPhone),
      });
    }

    return NextResponse.json({
      success: true,
      email: authData.user.email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Gagal memproses metode login." },
      { status: 500 },
    );
  }
}
