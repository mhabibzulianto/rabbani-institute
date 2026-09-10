import { NextResponse } from "next/server";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";

export async function POST(request) {
  try {
    const { examSlug, accessToken } = await request.json();
    const supabase = createSupabasePublicServerClient();
    const { data, error } = await supabase.rpc("exam_start_attempt", {
      p_exam_slug: examSlug,
      p_access_token: accessToken,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Attempt ujian tidak bisa dimulai." }, { status: 500 });
  }
}
