import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { verifyLandingRequest, landingRequestProof } from "../../../packages/landing-page/revalidation.mjs";
import { readLandingBody } from "../../../packages/landing-page/request-body.mjs";
export const runtime = "nodejs";
export async function POST(request) {
  const secret = process.env.LANDING_REVALIDATION_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ ok: false }, { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 1024) return NextResponse.json({ ok: false }, { status: 413 });
  let payload, signature;
  try {
    signature = request.headers.get("x-landing-signature");
    payload = verifyLandingRequest(await readLandingBody(request), signature, secret);
  } catch (error) { return NextResponse.json({ ok: false }, { status: error instanceof RangeError ? 413 : 401 }); }
  const { data, error } = await createSupabasePublicClient().rpc("claim_landing_sync", { request_proof: landingRequestProof(signature) });
  if (error || String(data) !== payload.revision) return NextResponse.json({ ok: false }, { status: 409 });
  revalidateTag("landing-home");
  revalidatePath("/", "page");
  return NextResponse.json({ ok: true, revision: payload.revision }, { headers: { "Cache-Control": "no-store" } });
}
