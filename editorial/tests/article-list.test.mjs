import assert from "node:assert/strict";
import test from "node:test";
import { applyArticleFilters, normalizeArticleFilters, articleListHref, formatArticleDate } from "../lib/article-list.mjs";

test("Article dates cross midnight in Jakarta at 17:00 UTC", () => {
  assert.equal(formatArticleDate("2026-10-06T16:59:00Z"), "6 Okt 2026");
  assert.equal(formatArticleDate("2026-10-06T17:00:00Z"), "7 Okt 2026");
});

test("Filters reject malformed input and reset invalid calendar dates", () => {
  const filters = normalizeArticleFilters({ q: ["bad"], status: "toString", author: "fake", category: "0", page: "-1", from: "2026-02-30", until: "2026-10-06" });
  assert.deepEqual(filters, { q: "", status: "", author: "", category: "", page: 1, from: "", until: "2026-10-06" });
  assert.equal(normalizeArticleFilters({ from: "2026-10-06", until: "2026-10-01" }).until, "2026-10-06");
  assert.equal(normalizeArticleFilters({ page: "99999999999999999999999" }).page, 1);
});

test("Status and pagination URLs preserve search/filter parameters", () => {
  const filters = normalizeArticleFilters({ q: "Al-Qur'an & ilmu", status: "draft", category: "3", page: "2" });
  const next = new URL(articleListHref(filters, { page: 3 }), "http://localhost:3001");
  assert.equal(next.searchParams.get("q"), "Al-Qur'an & ilmu");
  assert.equal(next.searchParams.get("category"), "3");
  assert.equal(next.searchParams.get("status"), "draft");
  assert.equal(next.searchParams.get("page"), "3");
  assert.equal(new URL(articleListHref(filters, { status: "published", page: 1 }), "http://localhost:3001").searchParams.has("page"), false);
});

test("Writer scope overrides author parameters and search wildcards are literal", () => {
  const calls = [];
  const query = Object.fromEntries(["eq", "ilike", "gte", "lt"].map((method) => [method, (...args) => { calls.push([method, ...args]); return query; }]));
  applyArticleFilters(query, normalizeArticleFilters({ q: "100%_", author: "00000000-0000-0000-0000-000000000005", from: "2026-10-01", until: "2026-10-06" }), "writer-id", false);
  assert.deepEqual(calls, [
    ["eq", "author_id", "writer-id"], ["ilike", "title", "%100\\%\\_%"],
    ["gte", "created_at", "2026-10-01T00:00:00+07:00"], ["lt", "created_at", "2026-10-07T00:00:00+07:00"],
  ]);
});
