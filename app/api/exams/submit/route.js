import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";

export async function POST(request) {
  try {
    const { attemptId, accessToken } = await request.json();
    const supabase = createSupabasePublicServerClient();
    const { data, error } = await supabase.rpc("exam_submit_attempt", {
      p_attempt_id: attemptId,
      p_access_token: accessToken,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Jawaban ujian tidak bisa dikirim." }, { status: 500 });
  }
}
