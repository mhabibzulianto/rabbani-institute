import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createDefaultLandingDocument, validateLandingDocument } from "../packages/landing-page/index.mjs";
import { collectionRequests } from "../packages/landing-page/collections.mjs";
import { attachCourseStats } from "@/lib/data";

export const getPublishedLanding = unstable_cache(async () => {
  try {
    const { data, error } = await createSupabasePublicClient().from("landing_page_publications").select("document").eq("page_slug", "home").maybeSingle();
    if (error) throw error;
    return data ? validateLandingDocument(data.document) : createDefaultLandingDocument();
  } catch (error) {
    console.error("Public landing fallback:", error.code || error.message);
    return createDefaultLandingDocument();
  }
}, ["published-landing-home-v1"], { revalidate: 300, tags: ["landing-home"] });

const sources = {
  courses: { table: "courses", columns: "id,slug,status,title_id,title_ar,description_id,description_ar,short_description_id,short_description_ar,price_idr,level,duration_minutes,course_model,duration_weeks,session_count,starts_at,ends_at,category:categories(id,title_id,title_ar)", status: "status", value: "published", order: "created_at" },
  exams: { table: "exam_modules", columns: "id,slug,title,subtitle,opens_at,closes_at,duration_minutes,max_attempts", status: "is_published", value: true, order: "opens_at" },
  articles: { table: "articles", columns: "id,slug,title,excerpt,content_raw,blocks,cover_image_url,published_at,created_at,author:profiles(full_name),category:categories(title_id,title_ar)", status: "status", value: "published", order: "published_at" },
};
const getPublicCollections = unstable_cache(async (requests) => {
  const client = createSupabasePublicClient();
  const entries = await Promise.all(requests.map(async ({ type, latestLimit, ids }) => {
    const source = sources[type];
    async function fetchItems(selected) {
      if (selected ? !ids.length : !latestLimit) return [];
      let query = client.from(source.table).select(source.columns).eq(source.status, source.value);
      if (selected) query = query.in("id", ids).limit(ids.length);
      else query = query.order(source.order, { ascending: false, nullsFirst: false }).order("id", { ascending: false }).limit(latestLimit);
      try {
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (error) { console.error(`Landing ${type}:`, error.code || error.message); return []; }
    }
    const [latest, selected] = await Promise.all([fetchItems(false), fetchItems(true)]);
    return [type, { latest, selected }];
  }));
  const pools = Object.fromEntries(entries);
  if (pools.courses) {
    const pool = pools.courses;
    const unique = [...new Map([...pool.latest, ...pool.selected].map((course) => [course.id, course])).values()];
    const stats = new Map((await attachCourseStats(client, unique)).map((course) => [course.id, course]));
    pool.latest = pool.latest.map((course) => stats.get(course.id));
    pool.selected = pool.selected.map((course) => stats.get(course.id));
  }
  return pools;
}, ["landing-public-collections-v1"], { revalidate: 300, tags: ["landing-home"] });

export async function getLandingContent(document) {
  // Cache only public collection requests, never draft documents or preview tokens.
  const requests = collectionRequests(document).map((request) => ({ ...request, ids: [...request.ids].sort((a, b) => a - b) })).sort((a, b) => a.type.localeCompare(b.type));
  return getPublicCollections(requests);
}
