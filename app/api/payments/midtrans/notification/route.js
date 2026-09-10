import { NextResponse } from "next/server";
import {
  parseOrderId,
  syncMidtransTransactionStatus,
  verifyMidtransSignature,
} from "@/lib/payments";

export async function POST(request) {
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
  }

  if (!verifyMidtransSignature(payload)) {
    return NextResponse.json({ ok: false, message: "Invalid signature" }, { status: 401 });
  }

  const parsed = parseOrderId(payload.order_id);

  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await syncMidtransTransactionStatus({
      orderId: payload.order_id,
      asAdmin: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: error.message || "Gagal sinkronisasi pembayaran." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
