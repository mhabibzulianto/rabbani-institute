import { redirect } from "next/navigation";
import { previewReturnHref } from "@/lib/article-preview.mjs";

// Old links and newly created drafts open the preview on the list.
export default async function ArticleDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const target = new URL(previewReturnHref(query?.returnTo), "http://editorial.local");
  target.searchParams.set("preview", id);
  if (query?.created === "1") target.searchParams.set("created", "1");
  redirect(`${target.pathname}${target.search}`);
}
