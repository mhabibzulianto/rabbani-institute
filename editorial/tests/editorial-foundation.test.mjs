import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { canAccessEditorial, canReviewArticles } from "../lib/access.mjs";

test("Editorial access fails closed and reviewer permissions stay separate", () => {
  for (const profile of [null, {}, { role: "student" }, { is_writer: "true" }]) {
    assert.equal(canAccessEditorial(profile), false);
    assert.equal(canReviewArticles(profile), false);
  }
  for (const profile of [{ role: "admin" }, { role: "instructor" }, { role: "student", is_writer: true }]) {
    assert.equal(canAccessEditorial(profile), true);
    assert.equal(canReviewArticles(profile), profile.role === "admin");
  }
});

test("PostgreSQL migration, RLS, workflow and conflict detection", async () => {
  const db = new PGlite();
  const ids = {
    writer: "00000000-0000-0000-0000-000000000001",
    student: "00000000-0000-0000-0000-000000000002",
    instructor: "00000000-0000-0000-0000-000000000003",
    admin: "00000000-0000-0000-0000-000000000004",
    other: "00000000-0000-0000-0000-000000000005",
  };
  const sql = (path) => readFile(new URL(path, import.meta.url), "utf8");
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create type public.user_role as enum ('student', 'instructor', 'admin');
      create table public.profiles (
        id uuid primary key, role public.user_role not null default 'student',
        is_writer boolean not null default false
      );
      create table public.categories (id bigint primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create function auth.role() returns text language sql stable as $$
        select nullif(current_setting('request.jwt.claim.role', true), '')
      $$;
      create function public.set_updated_at() returns trigger language plpgsql as $$
        begin new.updated_at := now(); return new; end;
      $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant select on public.profiles to anon, authenticated;
    `);
    await db.exec(await sql("../../supabase/articles_patch.sql"));
    await db.exec(await sql("../../supabase/account_center_patch.sql"));
    await db.exec(`
      insert into public.profiles (id, role, is_writer) values
      ('${ids.writer}', 'student', true), ('${ids.student}', 'student', false),
      ('${ids.instructor}', 'instructor', false), ('${ids.admin}', 'admin', false),
      ('${ids.other}', 'student', true);
      insert into public.articles (author_id, title, slug, blocks, content_raw)
      values ('${ids.writer}', 'Legacy', 'legacy', '[{"type":"p","children":[{"text":"Preserved"}]}]', 'Legacy source');
      grant select, insert, update, delete on public.account_app_memberships to authenticated;
      grant usage, select on all sequences in schema public to authenticated;
      grant select on public.articles to anon;
    `);
    const migration = await sql("../../supabase/editorial_foundation_patch.sql");
    await db.exec(migration);
    await db.exec(migration);
    let article = (await db.query("select * from public.articles where id = 1")).rows[0];
    assert.equal(article.content_raw, "Legacy source");
    assert.equal(article.blocks[0].children[0].text, "Preserved");
    assert.equal(article.content_json, null);
    assert.equal(Number(article.version), 1);

    async function login(actor, role = "authenticated") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)", [ids[actor] || "", role]);
      await db.exec(`set role ${role}`);
    }
    const deny = async (statement, pattern = /access|required|policy|permission|locked|draft|publish|transition|version|constraint|own/i) => {
      await assert.rejects(db.exec(statement), pattern);
    };
    await login("student");
    await deny(`update public.profiles set is_writer = true where id = '${ids.student}'`);
    await deny(`insert into public.articles(author_id,title,slug) values('${ids.student}','Student','student')`);
    await deny("select public.touch_account_app('editorial')");
    await deny(`insert into public.account_app_memberships(user_id,app_slug) values('${ids.student}','editorial')`);
    assert.equal((await db.query("select * from public.articles where id = 1")).rows.length, 0);
    await login("writer");
    await db.exec("select public.touch_account_app('editorial')");
    await db.exec("select public.touch_account_app('madrasah')");
    await deny(`insert into public.articles(author_id,title,slug,status) values('${ids.writer}','Publish','publish','published')`);
    await deny(`insert into public.articles(author_id,title,slug) values('${ids.other}','Other','other')`);
    await deny("update public.articles set status = 'published' where id = 1");
    await deny("update public.articles set admin_note = 'Forged' where id = 1");
    await deny(`update public.articles set author_id = '${ids.other}' where id = 1`);
    for (const invalid of ["{}", '{"type":"doc"}', '{"type":"doc","content":null}', '{"type":"paragraph","content":[]}']) {
      await deny(`update public.articles set content_json = '${invalid}' where id = 1`);
    }
    await db.exec(`update public.articles set
      content_legacy_backup = jsonb_build_object('blocks', blocks, 'content_raw', content_raw),
      content_json = '{"type":"doc","content":[]}', content_raw = 'MVP content'
      where id = 1 and version = 1`);
    article = (await db.query("select * from public.articles where id = 1")).rows[0];
    assert.equal(Number(article.version), 2);
    assert.ok(article.last_saved_at);
    assert.ok(article.content_legacy_backup);
    const staleSave = await db.query("update public.articles set title = 'Stale autosave' where id = 1 and version = 1 returning id");
    assert.equal(staleSave.rows.length, 0);
    assert.notEqual((await db.query("select title from public.articles where id = 1")).rows[0].title, "Stale autosave");
    await deny("select public.transition_editorial_article(1, 1, 'submitted')", /reload|changed/i);
    await db.exec("select public.transition_editorial_article(1, 2, 'submitted')");
    await deny("update public.articles set title = 'Changed while submitted' where id = 1");
    await deny("select public.transition_editorial_article(1, 3, 'draft')");
    await deny("select public.transition_editorial_article(1, 3, 'published')");
    assert.equal((await db.query("delete from public.articles where id = 1 returning id")).rows.length, 0);
    await login("other");
    await deny("select public.transition_editorial_article(1, 3, 'submitted')", /reload|changed/i);
    await login("admin");
    await db.exec("select public.transition_editorial_article(1, 3, 'rejected', 'Please revise')");
    await login("writer");
    await deny("select public.transition_editorial_article(1, 4, 'submitted')", /draft/i);
    await db.exec("select public.transition_editorial_article(1, 4, 'draft')");
    await db.exec("update public.articles set content_raw = 'Updated by legacy editor' where id = 1");
    assert.equal((await db.query("select content_json from public.articles where id = 1")).rows[0].content_json, null);
    await db.exec("select public.transition_editorial_article(1, 6, 'submitted')");
    await login("admin");
    await db.exec("select public.transition_editorial_article(1, 7, 'published')");
    assert.ok((await db.query("select published_at from public.articles where id = 1")).rows[0].published_at);
    await login("", "anon");
    assert.equal((await db.query("select id from public.articles where id = 1")).rows.length, 1);
    await deny("select public.transition_editorial_article(1, 8, 'archived')");
    await login("writer");
    await deny("update public.articles set title = 'Edit published' where id = 1");
    await login("admin");
    assert.equal((await db.query("delete from public.articles where id = 1 returning id")).rows.length, 0);
    await db.exec("select public.transition_editorial_article(1, 8, 'archived')");
    await login("", "anon");
    assert.equal((await db.query("select id from public.articles where id = 1")).rows.length, 0);
    await login("instructor");
    await db.exec(`insert into public.articles(author_id,title,slug) values('${ids.instructor}','Instructor','instructor')`);
    await deny("update public.articles set status = 'published' where slug = 'instructor'");
    assert.equal((await db.query("delete from public.articles where slug = 'instructor' returning id")).rows.length, 1);
    await db.exec("reset role");
    await db.exec(`update public.profiles set is_writer = false where id = '${ids.writer}'`);
    await login("writer");
    await deny(`insert into public.articles(author_id,title,slug) values('${ids.writer}','Revoked','revoked')`);
    await deny("select public.touch_account_app('editorial')");
  } finally {
    await db.close();
  }
});
