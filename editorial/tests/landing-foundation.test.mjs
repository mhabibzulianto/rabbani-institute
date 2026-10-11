import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { canManageLandingPage, landingSettingItems } from "../lib/access.mjs";
import { createDefaultLandingDocument, validateLandingDocument, landingSchema } from "../lib/landing-document.mjs";

test("Landing menu only exposes admin access, with the same filtered list for both navigation surfaces", () => {
  const items = [{ href: "/halaman-utama" }, { href: "/kontak" }];
  for (const profile of [null, { role: "student" }, { role: "instructor" }, { role: "writer", is_writer: true }]) {
    assert.equal(canManageLandingPage(profile), false);
    assert.deepEqual(landingSettingItems(items, profile), [{ href: "/kontak" }]);
  }
  assert.deepEqual(landingSettingItems(items, { role: "admin" }), items);
});

test("Shared landing schema accepts default content and rejects unsafe or oversized documents", () => {
  const baseline = createDefaultLandingDocument();
  assert.deepEqual(validateLandingDocument(baseline), baseline);
  baseline.blocks[0].props.title = "Berubah";
  assert.notEqual(createDefaultLandingDocument().blocks[0].props.title, "Berubah");
  const bad = (mutate) => {
    const doc = createDefaultLandingDocument(); mutate(doc);
    assert.throws(() => validateLandingDocument(doc), /tidak valid/);
  };
  bad((d) => { d.schemaVersion = 2; });
  bad((d) => { d.blocks[0].props.html = "<script>"; });
  bad((d) => { d.blocks[1].id = d.blocks[0].id; });
  bad((d) => { d.blocks[0].type = "__proto__"; });
  for (const url of ["javascript:alert(1)", "//evil.com", "/\\evil.com", "https://example.com\n", "https://user:password@example.com"]) {
    bad((d) => { d.blocks[0].props.buttons[0].href = url; });
  }
  bad((d) => { d.blocks = Array.from({ length: 41 }, (_, i) => ({ ...d.blocks[0], id: `block${i}` })); });
  bad((d) => { d.blocks[0].props.title = "a".repeat(201); });
  bad((d) => { d.blocks[0].props.title = d; });
  bad((d) => { d.blocks[0].props.title = "a".repeat(262145); });
  bad((d) => {
    let node = { type: "paragraph" };
    for (let i = 0; i < 20; i++) node = { type: "listItem", content: [node] };
    d.blocks.push({ id: "text", type: "text", enabled: true, props: { content: { type: "doc", content: [node] } } });
  });
});

test("SQL migration is rerunnable; draft access, RPCs, immutable snapshots, and CAS enforce admin boundaries", async () => {
  const sql = await readFile(new URL("../../supabase/landing_page_editor_patch.sql", import.meta.url), "utf8");
  assert.ok(sql.includes(`$schema$${JSON.stringify(landingSchema)}$schema$`));
  assert.ok(sql.includes(`$default$${JSON.stringify(createDefaultLandingDocument())}$default$`));
  const db = new PGlite();
  const admin = "00000000-0000-0000-0000-000000000001";
  const instructor = "00000000-0000-0000-0000-000000000002";
  const writer = "00000000-0000-0000-0000-000000000003";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      create table public.profiles(id uuid primary key,role text,is_writer boolean default false);
      insert into public.profiles values('${admin}','admin',false),('${instructor}','instructor',false),('${writer}','student',true);`);
    await db.exec(sql); await db.exec(sql);
    const login = async (id = "", role = "authenticated") => {
      await db.exec(`reset role; set request.jwt.claim.sub='${id}'; set role ${role};`);
    };
    const deny = async (query, params = []) => assert.rejects(db.query(query, params));
    const read = async () => (await db.query("select * from public.landing_pages")).rows;
    const save = "select (public.save_landing_draft('home',$1,$2::jsonb)).draft_version as version";
    const publish = "select (public.publish_landing_page('home',$1,'Test')).revision_id as id";
    const doc = createDefaultLandingDocument();
    for (const id of [instructor, writer]) {
      await login(id);
      assert.equal((await read()).length, 0);
      assert.equal((await db.query("select * from public.landing_page_revisions")).rows.length, 0);
      await deny(save, [1, JSON.stringify(doc)]);
      await deny(publish, [1]);
    }
    await login("", "anon");
    await deny("select * from public.landing_pages");
    await deny("select * from public.landing_page_revisions");
    await deny(save, [1, JSON.stringify(doc)]);
    assert.equal((await db.query("select * from public.landing_page_publications")).rows.length, 0);
    await login(admin);
    assert.equal((await read())[0].draft_version, 1);
    await deny("update public.landing_pages set draft_version=99");
    await deny("delete from public.landing_pages");
    await deny(save, [null, JSON.stringify(doc)]);
    const invalid = structuredClone(doc);
    invalid.blocks[0].props.buttons[0].href = "javascript:alert(1)";
    await deny(save, [1, JSON.stringify(invalid)]);
    for (const mutate of [
      (d) => { d.schemaVersion = 99; },
      (d) => { d.blocks[0].props.css = "position:fixed"; },
      (d) => { d.blocks[0].enabled = "true"; },
      (d) => { d.blocks[0].type = "constructor"; },
      (d) => { d.blocks[2].props.limit = 100; },
      (d) => { d.blocks[0].props.title = "a".repeat(201); },
      (d) => {
        d.blocks.push({ id: "injection", type: "text", enabled: true, props: { content: {
          type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "link", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }],
        } } });
      },
    ]) {
      const malformed = structuredClone(doc); mutate(malformed);
      await deny(save, [1, JSON.stringify(malformed)]);
    }
    invalid.blocks[0].props.buttons[0].href = "/safe";
    invalid.blocks[1].id = invalid.blocks[0].id;
    await deny(save, [1, JSON.stringify(invalid)]);
    doc.blocks[0].props.title = "Draft privé";
    assert.equal((await db.query(save, [1, JSON.stringify(doc)])).rows[0].version, 2);
    await deny(save, [1, JSON.stringify(doc)]);
    await deny(publish, [1]);
    const revision = (await db.query(publish, [2])).rows[0].id;
    assert.equal((await db.query(publish, [2])).rows[0].id, revision);
    assert.equal((await db.query("select * from public.landing_page_revisions")).rows.length, 1);
    await deny("update public.landing_page_revisions set note='tampered'");
    await deny("delete from public.landing_page_revisions");
    await deny("update public.landing_page_publications set document='{}'");
    doc.blocks[0].props.title = "Draft berikutnya";
    await db.query(save, [2, JSON.stringify(doc)]);
    // Rerunning a patch must not replace existing draft or published content.
    await db.exec("reset role"); await db.exec(sql);
    await login(admin);
    assert.equal((await read())[0].draft_document.blocks[0].props.title, "Draft berikutnya");
    await login("", "anon");
    const snapshot = (await db.query("select * from public.landing_page_publications")).rows[0];
    assert.equal(snapshot.document.blocks[0].props.title, "Draft privé");
    assert.equal(snapshot.draft_document, undefined);
    await deny(publish, [3]);
  } finally { await db.close(); }
});
