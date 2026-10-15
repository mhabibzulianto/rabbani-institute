import test from "node:test";
import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { jakartaDay, reportMonth, monthWindow, monthCells, shiftMonth, selectedReportDay, calendarEvents } from "../lib/report-calendar.mjs";
const article = { id: 1, title: "Tulisan", author_id: "writer-a", status: "published", author: { full_name: "Penulis A" }, published_at: "2026-10-12T17:00:00Z" };

test("calendar uses Jakarta boundaries, leap years and month navigation", () => {
  assert.equal(jakartaDay("2026-10-12T16:59:59Z"), "2026-10-12");
  assert.equal(jakartaDay("2026-10-12T17:00:00Z"), "2026-10-13");
  assert.equal(jakartaDay("invalid"), "");
  assert.deepEqual(monthWindow("2026-12"), { from: "2026-12-01T00:00:00+07:00", until: "2027-01-01T00:00:00+07:00" });
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(monthCells("2024-02").filter(c => c.current).length, 29);
  assert.equal(monthCells("2026-02").filter(c => c.current).length, 28);
  assert.equal(monthCells("2026-10")[0].day, "2026-09-28");
  assert.equal(reportMonth("2026-13", new Date("2026-10-31T18:00:00Z")), "2026-11");
  assert.equal(selectedReportDay("2026-02-30", "2026-02", "2026-10-13"), "2026-02-01");
});
test("history counts submissions and repeated publication without duplicating current published_at", () => {
  const data = calendarEvents({ revisions: [
    { id: 1, reason: "submitted", created_at: "2026-10-10T17:00:00Z", article },
    { id: 2, reason: "published", created_at: "2026-10-12T17:00:00Z", article, title: "Judul saat terbit" },
    { id: 3, reason: "submitted", created_at: "2026-10-14T17:00:00Z", article },
    { id: 4, reason: "published", created_at: "2026-10-15T17:00:00Z", article },
  ], publications: [article], schedules: [{ ...article, status: "submitted", scheduled_at: "2026-10-20T17:00:00Z", publication_error: "failed" }, { ...article, id: 2, scheduled_at: "2026-10-21T00:00:00Z" }] }, "2026-10");
  assert.equal(data.length, 5);
  assert.equal(data.filter(e => e.kind === "published").length, 2);
  assert.equal(data.filter(e => e.kind === "submitted").length, 2);
  assert.equal(data.find(e => e.id === "revision-2").title, "Judul saat terbit");
  assert.equal(data.find(e => e.kind === "scheduled").failed, true);
  assert.equal(data.find(e => e.kind === "scheduled").day, "2026-10-21");
});
test("legacy publications use only their published date; drafts and updated_at cannot invent submissions", () => {
  const events = calendarEvents({ publications: [article, { ...article, id: 2, published_at: null, updated_at: article.published_at }, { ...article, id: 3, published_at: "2026-09-01T00:00:00Z" }], schedules: [{ ...article, status: "draft", scheduled_at: article.published_at }] }, "2026-10");
  assert.equal(events.length, 1); assert.equal(events[0].kind, "published");
});
test("server calendar explicitly scopes each query and reports partial data failures", async () => {
  const filename = fileURLToPath(new URL("../lib/report-calendar.js", import.meta.url));
  const require = createRequire(filename), ts = require("typescript");
  const helpers = await import("../lib/report-calendar.mjs");
  let admin = false, failHistory = false, calls = [];
  const other = { ...article, id: 2, author_id: "writer-b" };
  const sources = { articles: [article, other], article_revisions: [{ id: 1, reason: "submitted", created_at: article.published_at, article }, { id: 2, reason: "submitted", created_at: article.published_at, article: other }] };
  const supabase = { from: table => {
    const filters = [], operations = [];
    const query = {};
    for (const method of ["select", "eq", "in", "gte", "lt", "order"]) query[method] = (...args) => { operations.push([method,...args]); if (["eq", "in", "gte", "lt"].includes(method)) filters.push([method,...args]); return query; };
    query.range = async (from,to) => {
      calls.push({ table, operations, from,to });
      if (table === "article_revisions" && failHistory) return { error: { code: "missing" } };
      const data = sources[table].filter(row => filters.every(([method,key,value]) => {
        const actual = key.split(".").reduce((obj,k) => obj?.[k], row);
        if (method === "eq") return actual === value;
        if (method === "in") return value.includes(actual);
        if (!actual) return false;
        return method === "gte" ? new Date(actual) >= new Date(value) : new Date(actual) < new Date(value);
      }));
      return { data: data.slice(from,to+1) };
    };
    return query;
  } };
  const mod = new Module(filename); mod.filename = filename;
  mod.require = name => {
    if (name === "@/lib/editorial") return { requireEditorialUser: async () => ({ user: { id: "writer-a" }, profile: { role: admin ? "admin" : "instructor" } }) };
    if (name === "@/lib/supabase/server") return { createSupabaseServerClient: async () => supabase };
    if (name === "@/lib/access.mjs") return { canReviewArticles: profile => profile.role === "admin" };
    if (name === "./report-calendar.mjs") return helpers;
    throw new Error(name);
  };
  mod._compile(ts.transpileModule(readFileSync(filename,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  const own = await mod.exports.getReportCalendar("2026-10");
  assert.ok(own.events.every(e => e.articleId === "1"));
  assert.equal(calls.length,3);
  assert.ok(calls.every(call => call.operations.some(([method,key,value]) => method === "eq" && key === (call.table === "article_revisions" ? "article.author_id" : "author_id") && value === "writer-a")));
  calls = []; admin = true;
  const all = await mod.exports.getReportCalendar("2026-10");
  assert.ok(all.events.some(e => e.articleId === "2"));
  assert.ok(!calls.some(call => call.operations.some(([method,key]) => method === "eq" && key.endsWith("author_id"))));
  failHistory = true;
  const partial = await mod.exports.getReportCalendar("2026-10");
  assert.equal(partial.notices.length,1);
  assert.equal(partial.events.filter(e => e.kind === "submitted").length,0);
  assert.equal(partial.events.filter(e => e.kind === "published").length,2);
  sources.articles = Array.from({ length: 501 }, (_, i) => ({ ...article, id: i + 1 })); calls = [];
  const paged = await mod.exports.getReportCalendar("2026-10");
  assert.equal(paged.events.length,501);
  assert.ok(calls.some(call => call.table === "articles" && call.from === 500));
});
