import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createDefaultLandingDocument } from "../../packages/landing-page/index.mjs";
import { validateLandingPublication, landingChanges, landingMetadata } from "../../packages/landing-page/publication.mjs";
import { signLandingRequest, verifyLandingRequest, landingRequestProof } from "../../packages/landing-page/revalidation.mjs";

test("publish validates required visible content without requiring alt text", () => {
  const doc = createDefaultLandingDocument();
  assert.deepEqual(validateLandingPublication(doc), doc);
  for (const mutate of [d => d.seo.title = " ", d => d.blocks[0].enabled = false, d => d.blocks[0].props.buttons[0].href = "", d => d.blocks[1].props.items[0].title = "", d => { d.blocks[2].props.source = "selected"; }]) {
    const bad = structuredClone(doc); mutate(bad); assert.throws(() => validateLandingPublication(bad));
  }
  doc.blocks.push({ id: "image", type: "imageText", enabled: true, props: { title: "Gambar", image: { src: "/image.jpg" }, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Penjelasan" }] }] } } });
  assert.doesNotThrow(() => validateLandingPublication(doc));
  doc.blocks.at(-1).props.content.content = []; assert.throws(() => validateLandingPublication(doc));
});

test("diff is stable for JSONB key order, reports reorder and metadata uses public canonical", () => {
  const doc = createDefaultLandingDocument(); const next = structuredClone(doc);
  next.blocks[0].props.title = "Judul baru"; next.blocks.reverse(); next.seo.description = "Baru";
  const diff = landingChanges(doc, next);
  assert.equal(diff.changed.length, 1); assert.equal(diff.reordered, true); assert.equal(diff.seo, true);
  const reorderedKeys = { blocks: doc.blocks, seo: { description: doc.seo.description, title: doc.seo.title }, schemaVersion: 1 };
  assert.equal(landingChanges(doc, reorderedKeys).seo, false);
  const seo = landingMetadata(next); assert.equal(seo.alternates.canonical, "https://www.rabbaniinstitute.id/"); assert.equal(seo.openGraph.description, "Baru"); assert.equal(seo.title.absolute, next.seo.title);
});

test("revalidation signatures bind exact body, page, time and revision", () => {
  const secret = "test-secret-".repeat(4); const now = 1700000000;
  const value = { page: "home", revision: "12", nonce: "a".repeat(64), timestamp: now };
  const body = JSON.stringify(value); const signature = signLandingRequest(body, secret);
  assert.deepEqual(verifyLandingRequest(body, signature, secret, now), value);
  assert.match(landingRequestProof(signature), /^[a-f0-9]{64}$/);
  assert.throws(() => verifyLandingRequest(body + " ", signature, secret, now));
  assert.throws(() => verifyLandingRequest(body, signature, secret, now + 301));
  assert.throws(() => verifyLandingRequest(body, signature, "other-secret-".repeat(4), now));
  assert.throws(() => signLandingRequest(body, "short"));
  for (const patch of [{ page: "/auth" }, { revision: 12 }, { nonce: "bad" }, { extra: "ignored" }]) {
    const bad = JSON.stringify({ ...value, ...patch }); assert.throws(() => verifyLandingRequest(bad, signLandingRequest(bad, secret), secret, now));
  }
});

test("publication SQL protects CAS, immutable history, restore, public references and durable replay", async () => {
  const db = new PGlite();
  const admin = "00000000-0000-0000-0000-000000000001", instructor = "00000000-0000-0000-0000-000000000002";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      create table public.profiles(id uuid primary key,role text); insert into public.profiles values('${admin}','admin'),('${instructor}','instructor');
      create table public.courses(id bigint,status text); insert into public.courses values(1,'published'),(2,'draft');
      create table public.articles(id bigint,status text); create table public.exam_modules(id bigint,is_published boolean);`);
    await db.exec(await readFile(new URL("../../supabase/landing_page_editor_patch.sql", import.meta.url), "utf8"));
    const patch = await readFile(new URL("../../supabase/landing_page_publication_patch.sql", import.meta.url), "utf8");
    await db.exec(patch); await db.exec(patch);
    const hardening = await readFile(new URL("../../supabase/landing_page_hardening_patch.sql", import.meta.url), "utf8");
    await db.exec(hardening); await db.exec(hardening);
    const validShortTitle = createDefaultLandingDocument(); validShortTitle.seo.title = "v";
    await db.query("select public.assert_landing_publication($1::jsonb)", [JSON.stringify(validShortTitle)]);
    for (const change of [d => d.seo.title = "\t\n\u00a0\u2000\u3000", d => d.seo.image = "#image", d => d.blocks[0].props.image = { src: "#image" }]) {
      const invalid = createDefaultLandingDocument(); change(invalid);
      await assert.rejects(db.query("select public.assert_landing_publication($1::jsonb)", [JSON.stringify(invalid)]));
    }
    const textDoc = createDefaultLandingDocument();
    textDoc.blocks.push({ id: "text", type: "imageText", enabled: true, props: { title: "Gambar", image: { src: "/image.jpg" }, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Isi benar" }] }] } } });
    await db.query("select public.assert_landing_publication($1::jsonb)", [JSON.stringify(textDoc)]);
    textDoc.blocks.at(-1).props.content.content = [{ type: "paragraph", text: "Tidak ditampilkan" }];
    assert.throws(() => validateLandingPublication(textDoc));
    await assert.rejects(db.query("select public.assert_landing_publication($1::jsonb)", [JSON.stringify(textDoc)]));
    const login = async (id, role = "authenticated") => db.exec(`reset role; set request.jwt.claim.sub='${id}'; set role ${role};`);
    const publish = async (version) => (await db.query("select to_jsonb(public.publish_landing_page('home',$1,'Release')) as p", [version])).rows[0].p;
    const save = async (version, doc) => db.query("select public.save_landing_draft('home',$1,$2::jsonb)", [version, JSON.stringify(doc)]);
    const doc = createDefaultLandingDocument();
    await login(instructor); await assert.rejects(publish(1)); await assert.rejects(db.query("select public.restore_landing_revision(1,1)"));
    await login(admin);
    const published = await publish(1); const revision = published.revision_id;
    assert.equal((await publish(1)).revision_id, revision);
    assert.equal((await db.query("select count(*)::int as n from public.landing_page_revisions")).rows[0].n, 1);
    await assert.rejects(db.query("update public.landing_page_revisions set note='changed'"));
    const changed = structuredClone(doc); changed.blocks[0].props.title = "New draft";
    await save(1, changed); await assert.rejects(publish(1));
    assert.equal((await db.query("select document from public.landing_page_publications")).rows[0].document.blocks[0].props.title, doc.blocks[0].props.title);
    const second = await publish(2);
    await assert.rejects(db.query("select public.restore_landing_revision($1,1)", [revision]));
    const restored = (await db.query("select to_jsonb(public.restore_landing_revision($1,2)) as r", [revision])).rows[0].r;
    assert.equal(restored.draft_version, 3); assert.deepEqual(restored.draft_document, doc);
    assert.equal((await db.query("select revision_id from public.landing_page_publications")).rows[0].revision_id, second.revision_id);
    const invalid = structuredClone(doc); invalid.blocks[2].props.source = "selected"; invalid.blocks[2].props.selectedIds = [2];
    await save(3, invalid); await assert.rejects(publish(4));
    invalid.blocks[2].props.selectedIds = [1]; await save(4, invalid); const third = await publish(5);
    const proof = "a".repeat(64);
    await assert.rejects(db.query("select public.register_landing_sync($1,$2)", [revision, proof]));
    await db.query("select public.register_landing_sync($1,$2)", [third.revision_id, proof]);
    await login("", "anon"); await assert.rejects(db.query("select * from public.landing_sync_requests")); await assert.rejects(db.query("select * from public.landing_publication_sync"));
    assert.equal((await db.query("select public.claim_landing_sync($1) as r", [proof])).rows[0].r, third.revision_id);
    assert.equal((await db.query("select public.claim_landing_sync($1) as r", [proof])).rows[0].r, null);
    await assert.rejects(db.query("select public.finish_landing_sync($1,true,'')", [third.revision_id]));
    await login(admin); await db.query("select public.finish_landing_sync($1,false,'Network')", [third.revision_id]);
    let sync = (await db.query("select * from public.landing_publication_sync where revision_id=$1", [third.revision_id])).rows[0];
    assert.equal(sync.synced_at, null); assert.equal(sync.last_error, "Network");
    const retryProof = "b".repeat(64); await db.query("select public.register_landing_sync($1,$2)", [third.revision_id, retryProof]);
    await db.query("select public.finish_landing_sync($1,true,'')", [third.revision_id]);
    sync = (await db.query("select * from public.landing_publication_sync where revision_id=$1", [third.revision_id])).rows[0];
    assert.equal(sync.attempts, 2); assert.ok(sync.synced_at); assert.equal(sync.last_error, "");
    await publish(5); assert.ok((await db.query("select synced_at from public.landing_publication_sync where revision_id=$1", [third.revision_id])).rows[0].synced_at);
    await db.exec("reset role; update public.landing_sync_requests set expires_at=now()-interval '1 second'");
    await login("", "anon"); assert.equal((await db.query("select public.claim_landing_sync($1) as r", [retryProof])).rows[0].r, null);
  } finally { await db.close(); }
});
