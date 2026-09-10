import { getPublishedArticlesPublic, getArticleExcerpt } from "@/lib/articles";
import { getArticleContentRaw, getArticleContentText } from "@/lib/gutenberg-content";
import { getPublishedCoursesPublic, localize } from "@/lib/data";
import { getArticlePublicUrl, getCoursePublicUrl } from "@/lib/platform-urls";
import { faqItems, searchablePages } from "@/lib/site-content";

export async function searchSite(rawQuery) {
  const query = (rawQuery || "").trim();

  if (!query) {
    return {
      query,
      total: 0,
      results: [],
    };
  }

  const normalizedQuery = normalizeSearchText(query);
  const [courses, articles] = await Promise.all([getPublishedCoursesPublic(), getPublishedArticlesPublic()]);

  const courseResults = courses.map((course) => ({
    title: localize(course, "title", "id"),
    url: getCoursePublicUrl(course.slug),
    type: "Kelas",
    excerpt: localize(course, "short_description", "id") || localize(course, "description", "id"),
    content: [
      localize(course, "title", "id"),
      localize(course, "short_description", "id"),
      localize(course, "description", "id"),
      localize(course?.category, "title", "id"),
      course.level,
      course.course_model,
    ].join(" "),
  }));

  const articleResults = articles.map((article) => ({
    title: article.title,
    url: getArticlePublicUrl(article.slug),
    type: "Artikel",
    excerpt: getArticleExcerpt(article),
    content: [
      article.title,
      article.excerpt,
      getArticleContentText(getArticleContentRaw(article)),
    ].join(" "),
  }));

  const faqResults = faqItems.map((item) => ({
    title: item.question,
    url: "/faq",
    type: "FAQ",
    excerpt: item.answer,
    content: `${item.question} ${item.answer}`,
  }));

  const allResults = [...courseResults, ...articleResults, ...faqResults, ...searchablePages];

  const rankedResults = allResults
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "id-ID"));

  return {
    query,
    total: rankedResults.length,
    results: rankedResults,
  };
}

function scoreEntry(entry, query) {
  const title = normalizeSearchText(entry.title);
  const excerpt = normalizeSearchText(entry.excerpt);
  const content = normalizeSearchText(entry.content);
  let score = 0;

  if (title.includes(query)) {
    score += 6;
  }

  if (excerpt.includes(query)) {
    score += 3;
  }

  if (content.includes(query)) {
    score += 1;
  }

  return score;
}

function normalizeSearchText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
