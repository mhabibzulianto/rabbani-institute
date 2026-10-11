import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createDefaultLandingDocument } from "../../packages/landing-page/index.mjs";
import { collectionRequests, collectionItems } from "../../packages/landing-page/collections.mjs";

test("collection batching skips hidden blocks, bounds latest fetches and preserves public manual order", () => {
  const document = createDefaultLandingDocument();
  document.blocks.find((b) => b.type === "exams").enabled = false;
  const articles = document.blocks.find((b) => b.type === "articles");
  articles.props.source = "selected"; articles.props.selectedIds = [8, 4, 8, 99];
  assert.deepEqual(collectionRequests(document), [{ type: "courses", latestLimit: 3, ids: [] }, { type: "articles", latestLimit: 0, ids: [8, 4, 99] }]);
  assert.deepEqual(collectionItems(articles, { articles: { selected: [{ id: 4 }, { id: 8 }], latest: [] } }), [{ id: 8 }, { id: 4 }]);
});

test("preview SQL enforces admin minting, one-time exchange, expiry and private immutable snapshots", async () => {
  const db = new PGlite();
  const admin = "00000000-0000-0000-0000-000000000001";
  const instructor = "00000000-0000-0000-0000-000000000002";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      create table public.profiles(id uuid primary key,role text);
      insert into public.profiles values('${admin}','admin'),('${instructor}','instructor');`);
    await db.exec(await readFile(new URL("../../supabase/landing_page_editor_patch.sql", import.meta.url), "utf8"));
    const patch = await readFile(new URL("../../supabase/landing_page_preview_patch.sql", import.meta.url), "utf8");
    await db.exec(patch); await db.exec(patch);
    const login = async (id, role = "authenticated") => db.exec(`reset role; set request.jwt.claim.sub='${id}'; set role ${role};`);
    const call = async (name, value) => (await db.query(`select public.${name}($1) as result`, [value])).rows[0].result;
    const document = createDefaultLandingDocument();
    await login(instructor);
    await assert.rejects(call("create_landing_preview", JSON.stringify(document)));
    await login(admin);
    const ticket = await call("create_landing_preview", JSON.stringify(document));
    assert.match(ticket, /^[a-f0-9]{64}$/);
    await assert.rejects(db.query("select * from public.landing_preview_tickets"));
    await login("", "anon");
    await assert.rejects(call("create_landing_preview", JSON.stringify(document)));
    await assert.rejects(db.query("select * from public.landing_preview_sessions"));
    assert.equal(await call("exchange_landing_preview", "bad"), null);
    const session = await call("exchange_landing_preview", ticket);
    assert.match(session, /^[a-f0-9]{64}$/);
    assert.equal(await call("exchange_landing_preview", ticket), null);
    assert.deepEqual(await call("read_landing_preview", session), document);
    assert.equal((await db.query("select count(*)::int as n from public.landing_page_publications")).rows[0].n, 0);
    await db.exec("reset role; update public.landing_preview_sessions set expires_at=now()-interval '1 second'");
    await login("", "anon");
    assert.equal(await call("read_landing_preview", session), null);
    await login(admin);
    const expired = await call("create_landing_preview", JSON.stringify(document));
    await db.exec("reset role; update public.landing_preview_tickets set expires_at=now()-interval '1 second'");
    await login("", "anon");
    assert.equal(await call("exchange_landing_preview", expired), null);
    await login(admin);
    const fresh = await call("create_landing_preview", JSON.stringify(document));
    await login("", "anon");
    const freshSession = await call("exchange_landing_preview", fresh);
    await db.exec(`reset role; update public.profiles set role='instructor' where id='${admin}'`);
    await login("", "anon");
    assert.equal(await call("read_landing_preview", freshSession), null);
  } finally { await db.close(); }
});
