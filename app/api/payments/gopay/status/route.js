import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: tx, error } = await supabase
    .from("payment_transactions")
    .select("transaction_status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error || !tx) {
    return NextResponse.json({ status: "unknown" });
  }

  return NextResponse.json({ status: tx.transaction_status });
}
