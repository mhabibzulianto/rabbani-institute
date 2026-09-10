import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getMidtransEnv,
  buildOrderId,
  resolveCoursePrice,
  persistPaymentRecord,
} from "@/lib/payments";

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const courseId = Number(body.courseId);

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    // Ambil detail kelas
    const admin = createSupabaseAdminClient();
    const { data: course, error: courseError } = await admin
      .from("courses")
      .select("id, slug, title_id, price_idr, status")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    const amount = resolveCoursePrice(course);
    if (amount <= 0) {
      return NextResponse.json({ error: "Kelas ini gratis" }, { status: 400 });
    }

    const orderId = buildOrderId({ courseId: course.id, userId: user.id });
    const env = getMidtransEnv();

    if (!env.serverKey) {
      return NextResponse.json({ error: "Midtrans Server Key belum dikonfigurasi" }, { status: 500 });
    }

    const siteBase = env.siteUrl.replace(/\/$/, "");
    // callback_url ke /pembayaran/selesai
    const callbackUrl = `${siteBase}/pembayaran/selesai?order_id=${encodeURIComponent(orderId)}&course=${encodeURIComponent(course.slug)}`;

    const midtransPayload = {
      payment_type: "gopay",
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      gopay: {
        enable_callback: true,
        callback_url: callbackUrl,
      },
      customer_details: {
        first_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Peserta",
        email: user.email,
      },
      item_details: [
        {
          id: String(course.id),
          price: amount,
          quantity: 1,
          name: course.title_id?.slice(0, 50) || "Kelas Rabbani Institute",
        },
      ],
    };

    const authHeader = `Basic ${Buffer.from(`${env.serverKey}:`).toString("base64")}`;
    const response = await fetch(`${env.apiBaseUrl}/v2/charge`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(midtransPayload),
      cache: "no-store",
    });

    const chargeResult = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: chargeResult.status_message || "Gagal melakukan charge transaksi ke Midtrans" },
        { status: response.status }
      );
    }

    // Dapatkan deep-link dan qr-code url
    let deeplinkUrl = null;
    let qrCodeUrl = null;

    if (chargeResult.actions && chargeResult.actions.length > 0) {
      const deepAction = chargeResult.actions.find((act) => act.name === "deeplink-redirect");
      const qrAction = chargeResult.actions.find((act) => act.name === "generate-qr-code");
      
      if (deepAction) deeplinkUrl = deepAction.url;
      if (qrAction) qrCodeUrl = qrAction.url;
    }

    // Simpan ke database
    await persistPaymentRecord({
      order_id: orderId,
      course_id: course.id,
      student_id: user.id,
      amount_idr: amount,
      snap_token: chargeResult.transaction_id || null,
      snap_redirect_url: deeplinkUrl || null,
      transaction_status: "pending",
      payment_type: "gopay",
      status_code: "201",
      fraud_status: null,
      raw_payload: chargeResult,
      paid_at: null,
    }, { asAdmin: true });

    return NextResponse.json({
      success: true,
      orderId,
      transactionId: chargeResult.transaction_id,
      actions: chargeResult.actions,
      deeplinkUrl,
      qrCodeUrl,
      amount,
      courseSlug: course.slug,
    });
  } catch (error) {
    console.error("GoPay charge handler error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
