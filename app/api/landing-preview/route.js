import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { readLandingBody } from "../../../packages/landing-page/request-body.mjs";
export async function POST(request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse("Permintaan tidak valid", { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return new NextResponse("Format tidak valid", { status: 415 });
  let ticket;
  try {
    const fields = new URLSearchParams(await readLandingBody(request));
    if ([...fields.keys()].join(",") !== "ticket") throw new Error("Invalid fields");
    ticket = fields.get("ticket");
  } catch (error) { return new NextResponse("Tiket tidak valid", { status: error instanceof RangeError ? 413 : 400 }); }
  if (typeof ticket !== "string" || !/^[a-f0-9]{64}$/.test(ticket)) return new NextResponse("Tiket tidak valid", { status: 400 });
  const { data, error } = await createSupabasePublicClient().rpc("exchange_landing_preview", { ticket });
  if (error || typeof data !== "string") return new NextResponse("Preview kedaluwarsa atau telah digunakan. Buka preview baru dari editor.", { status: 410, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  const response = NextResponse.redirect(new URL("/landing-preview?ready=1", request.url), 303);
  response.cookies.set("landing-preview-session", data, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/landing-preview", maxAge: 1800 });
  response.headers.set("Cache-Control", "no-store"); response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
