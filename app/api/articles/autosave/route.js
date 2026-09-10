import { NextResponse } from "next/server";
import { rawToLegacyBlocks } from "@/lib/gutenberg-content";
import { canAuthorArticles, isAdmin } from "@/lib/access";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request) {
  const { user, profile } = await getCurrentUser();

  if (!user || !canAuthorArticles(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const body = await request.json();
  const articleId = Number(body.articleId) || null;
  const title = `${body.title || ""}`.trim() || "Untitled";
  const slug = await getUniqueSlug(supabase, toSlug(body.slug || title || "Untitled"), articleId);
  const payload = {
    author_id: user.id,
    title,
    slug,
    topic: emptyToNull(body.topic),
    tags: Array.isArray(body.tags) ? body.tags : [],
    excerpt: emptyToNull(body.excerpt),
    cover_image_url: emptyToNull(body.coverImageUrl),
    status: normalizeStatus(body.status, profile),
    content_raw: typeof body.contentRaw === "string" && body.contentRaw.trim()
      ? body.contentRaw
      : JSON.stringify([{ type: "p", children: [{ text: "" }] }]),
    blocks: rawToLegacyBlocks(body.contentRaw),
    submitted_at: body.status === "submitted" ? new Date().toISOString() : null,
  };

  try {
    if (articleId) {
      const { data: existing } = await supabase
        .from("articles")
        .select("id, author_id")
        .eq("id", articleId)
        .maybeSingle();

      if (!existing || (!isAdmin(profile) && existing.author_id !== user.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data, error } = await supabase
        .from("articles")
        .update(payload)
        .eq("id", articleId)
        .select("id, slug, title")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({ article: data });
    }

    const { data, error } = await supabase
      .from("articles")
      .insert(payload)
      .select("id, slug, title")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ article: data });
  } catch (error) {
    const fallbackPayload = {
      author_id: user.id,
      title,
      slug,
      excerpt: emptyToNull(body.excerpt),
      cover_image_url: emptyToNull(body.coverImageUrl),
      status: normalizeStatus(body.status, profile),
      blocks: rawToLegacyBlocks(body.contentRaw),
    };

    if (articleId) {
      const { data, error: updateError } = await supabase
        .from("articles")
        .update(fallbackPayload)
        .eq("id", articleId)
        .select("id, slug, title")
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ article: data });
    }

    const { data, error: insertError } = await supabase
      .from("articles")
      .insert(fallbackPayload)
      .select("id, slug, title")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message, details: error?.message }, { status: 500 });
    }

    return NextResponse.json({ article: data });
  }
}

async function getUniqueSlug(supabase, baseSlug, articleId) {
  let candidate = baseSlug || "untitled";
  let suffix = 2;

  while (true) {
    const { data } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data || (articleId && Number(data.id) === Number(articleId))) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function normalizeStatus(status, profile) {
  const requested = `${status || "draft"}`.toLowerCase();

  if (!isAdmin(profile)) {
    return ["draft", "submitted", "published", "rejected"].includes(requested)
      ? requested
      : "draft";
  }

  return ["draft", "submitted", "published", "rejected", "archived"].includes(requested)
    ? requested
    : "draft";
}

function emptyToNull(value) {
  const normalized = `${value || ""}`.trim();
  return normalized || null;
}

function toSlug(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}
