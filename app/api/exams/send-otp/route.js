import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { formatWhatsappNumber, normalizeWhatsappNumber } from "@/lib/exam-utils";

export async function POST(request) {
  try {
    const { examSlug, phone } = await request.json();
    const normalizedPhone = normalizeWhatsappNumber(phone);

    if (!examSlug || !normalizedPhone) {
      return NextResponse.json({ error: "Slug ujian dan nomor WhatsApp wajib diisi." }, { status: 400 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const supabase = createSupabasePublicServerClient();

    const { data, error } = await supabase.rpc("exam_request_otp", {
      p_exam_slug: examSlug,
      p_phone: normalizedPhone,
      p_code: code,
      p_expires_at: expiresAt,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const wablasToken = process.env.WABLAS_TOKEN?.trim();
    const wablasSecretKey = process.env.WABLAS_SECRET_KEY?.trim();
    const wablasBaseUrl = process.env.WABLAS_BASE_URL?.trim() || "https://tegal.wablas.com";

    if (!wablasToken) {
      return NextResponse.json({ error: "WABLAS_TOKEN belum diatur di environment production." }, { status: 500 });
    }

    const message = `Kode OTP ujian kamu: *${code}*\nBerlaku 5 menit.\nJangan bagikan ke siapa pun.`;
    const authorizationHeader = wablasSecretKey ? `${wablasToken}.${wablasSecretKey}` : wablasToken;

    const wablasResponse = await fetch(`${wablasBaseUrl}/api/send-message`, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        message,
      }),
    });

    if (!wablasResponse.ok) {
      const wablasError = await wablasResponse.text();
      return NextResponse.json(
        {
          error: `Gagal mengirim WhatsApp OTP. ${wablasError}`,
          hint: wablasSecretKey
            ? "Periksa token, secret key, dan status device Wablas."
            : "Wablas menolak request dari IP server saat ini. Gunakan secret key Wablas atau whitelist IP server yang tepat.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      phone: formatWhatsappNumber(normalizedPhone),
      expires_at: expiresAt,
      meta: data,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Terjadi kesalahan saat mengirim OTP." }, { status: 500 });
  }
}
