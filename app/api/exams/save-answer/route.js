import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";

export async function POST(request) {
  try {
    const { attemptId, accessToken, questionId, response } = await request.json();
    const supabase = createSupabasePublicServerClient();
    const { data, error } = await supabase.rpc("exam_save_answer", {
      p_attempt_id: attemptId,
      p_access_token: accessToken,
      p_question_id: questionId,
      p_response: response,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Jawaban tidak bisa disimpan." }, { status: 500 });
  }
}
