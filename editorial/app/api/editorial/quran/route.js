import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { canAccessEditorial } from "@/lib/access.mjs";
import chapters from "@/lib/quran-chapters.json";
import { validateQuranRange, normalizeQuranVerse } from "@/lib/quran-selection.mjs";

export const runtime = "nodejs";
export async function GET(request) {
  const { user, profile } = await getCurrentUser();
  if (!user || !canAccessEditorial(profile)) return NextResponse.json({ error: "Masuk dengan akun editorial untuk memilih ayat." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const chapter = chapters.find(item => item.id === Number(params.get("chapter")));
  let range;
  try { range = validateQuranRange(chapter, params.get("from"), params.get("to")); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
  try {
    const verses = [];
    // Bound concurrent upstream work. Cached Arabic data needs no API key.
    for (let number = range.from; number <= range.to; number += 4) {
      const batch = Array.from({ length: Math.min(4, range.to - number + 1) }, (_, offset) => number + offset);
      verses.push(...await Promise.all(batch.map(async ayah => {
        const response = await fetch("https://api.quran.com/api/v4/verses/by_key/" + chapter.id + ":" + ayah + "?words=true&word_fields=text_uthmani&fields=text_uthmani", { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error("Sumber ayat belum tersedia.");
        return normalizeQuranVerse((await response.json()).verse, chapter.id, ayah);
      })));
    }
    return NextResponse.json({ verses, source: "Quran.com" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Ayat belum dapat dimuat dari Quran.com. Periksa koneksi lalu coba lagi." }, { status: 502 });
  }
}
