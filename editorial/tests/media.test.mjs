import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validateMediaMetadata, validateMediaBytes, safeMediaUrl } from "../lib/media-validation.mjs";
import { validateEditorDocument, serializeLegacyDocument, prepareEditorDocument, normalizeEditorPayload } from "../lib/editor-document.mjs";
import { getArticlePreview } from "../lib/article-preview.mjs";

test("Media accepts empty alt text and rejects unsafe URLs, unsupported types and oversized files", () => {
  assert.equal(validateMediaMetadata({ name: "gambar.png", type: "image/png", size: 100 }).alt, "");
  assert.throws(() => validateMediaMetadata({ name: "x.svg", type: "image/svg+xml", size: 10 }));
  assert.throws(() => validateMediaMetadata({ name: "x.png", type: "image/png", size: 10485761 }));
  assert.throws(() => validateMediaMetadata({ name: "x.pdf", type: "application/pdf", size: 52428801 }));
  assert.throws(() => validateMediaMetadata({ name: "x.png", type: "image/png", size: 100, alt: "a".repeat(501) }));
  for (const url of ["javascript:alert(1)", "data:image/png,x", "//evil.example/x", "https://user:pass@example.com/x", "mailto:x@example.com"]) assert.equal(safeMediaUrl(url), false);
  assert.equal(safeMediaUrl("https://example.com/photo.png"), true);
});

test("File signatures reject disguised uploads before storage writes", () => {
  const encode = (value) => new TextEncoder().encode(value);
  for (const type of ["image/png", "image/jpeg", "application/pdf", "video/mp4", "audio/mpeg"]) assert.throws(() => validateMediaBytes(type, encode("<html>not media</html>")));
  validateMediaBytes("application/pdf", encode("%PDF-1.7"));
  validateMediaBytes("image/png", new Uint8Array([137,80,78,71,13,10,26,10]));
  validateMediaBytes("audio/wav", encode("RIFFxxxxWAVE"));
  validateMediaBytes("video/mp4", encode("xxxxftypisom"));
});

test("Media documents round-trip to the public reader with caption, formatting, list numbering and separators", () => {
  const nodes = ["image", "video", "audio", "document"].map((type) => ({ type, attrs: { src: `https://example.com/${type}`, alt: "", caption: "Caption <safe>", filename: "file" } }));
  const doc = validateEditorDocument({ type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }] }, ...nodes,
    { type: "horizontalRule" }, { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Third" }] }] }] },
  ] });
  const legacy = serializeLegacyDocument(doc);
  const imported = prepareEditorDocument(legacy);
  assert.equal(imported.unsupported, false);
  assert.deepEqual(imported.content, doc);
  const preview = getArticlePreview({ content_raw: legacy.content_raw });
  assert.match(preview.html, /Caption &lt;safe&gt;/);
  assert.match(preview.html, /<audio/);
  assert.match(preview.html, /<hr/);
  assert.match(preview.html, /start="3"/);
  assert.match(preview.html, /<strong>Bold/);
  assert.throws(() => validateEditorDocument({ type: "doc", content: [{ type: "image", attrs: { src: "javascript:alert(1)" } }] }));
  const payload = { id: "1", version: 1, title: "Title", excerpt: "", topic: "", tags: "", category: "", doc };
  assert.equal(normalizeEditorPayload({ ...payload, cover: "https://example.com/cover.jpg" }).cover_image_url, "https://example.com/cover.jpg");
  assert.equal(normalizeEditorPayload({ ...payload, cover: "" }).cover_image_url, null);
  assert.throws(() => normalizeEditorPayload({ ...payload, cover: "data:x" }));
});

test("Media migration reruns safely and restricts library/storage/category permissions", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-0000-0000-000000000001", other = "00000000-0000-0000-0000-000000000002", admin = "00000000-0000-0000-0000-000000000003", student = "00000000-0000-0000-0000-000000000004";
  const asset = "10000000-0000-0000-0000-000000000001";
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table public.profiles (id uuid primary key, role text, is_writer boolean default false);
      insert into public.profiles values ('${owner}','student',true),('${other}','instructor',false),('${admin}','admin',false),('${student}','student',false);
      create function public.can_author_articles() returns boolean language sql stable security definer as $$ select coalesce((select role in ('admin','instructor') or is_writer from public.profiles where id = auth.uid()),false) $$;
      create table public.categories (id bigint generated always as identity primary key, title_id text not null, slug text unique not null check(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'), is_active boolean default true);
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text unique);
      alter table storage.objects enable row level security;
      grant usage on schema public,auth,storage to authenticated,anon;
      grant select on public.profiles to authenticated;
      grant select,insert,delete on storage.objects to authenticated;
    `);
    const migration = await readFile(new URL("../../supabase/editorial_media_patch.sql", import.meta.url), "utf8");
    await db.exec(migration); await db.exec(migration);
    async function login(id) { await db.exec(`reset role; set request.jwt.claim.sub = '${id}'; set role authenticated;`); }
    await login(owner);
    const category = (await db.query("select * from public.create_editorial_category(' Ilmu Islam ')")).rows[0];
    assert.equal(category.title_id, "Ilmu Islam");
    assert.equal((await db.query("select * from public.create_editorial_category('ilmu islam')")).rows[0].id, category.id);
    assert.equal((await db.query("select * from public.create_editorial_category('العلم')")).rows.length, 1);
    await assert.rejects(db.exec("select * from public.create_editorial_category('x')"));
    await db.exec(`insert into storage.objects(bucket_id,name) values ('editorial-media','${owner}/${asset}.png');
      insert into public.editorial_media(id,owner_id,path,name,mime_type,kind,size_bytes) values ('${asset}','${owner}','${owner}/${asset}.png','x.png','image/png','image',100);`);
    assert.equal((await db.query("select alt from public.editorial_media")).rows[0].alt, "");
    assert.equal((await db.query(`delete from storage.objects where name = '${owner}/${asset}.png' returning *`)).rows.length, 0);
    await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values ('editorial-media','${other}/${asset}.png')`));
    await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values ('editorial-media','${owner}/${asset}.svg')`));
    await login(other);
    assert.equal((await db.query("select * from public.editorial_media")).rows.length, 0);
    await assert.rejects(db.exec(`insert into public.editorial_media(id,owner_id,path,name,mime_type,kind,size_bytes) values (gen_random_uuid(),'${owner}','x','x.png','image/png','image',10)`));
    await login(admin);
    assert.equal((await db.query("select * from public.editorial_media")).rows.length, 1);
    await login(student);
    assert.equal((await db.query("select * from public.editorial_media")).rows.length, 0);
    await assert.rejects(db.exec("select * from public.create_editorial_category('No access')"));
    await assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values ('editorial-media','${student}/${asset}.png')`));
    await db.exec("reset role; set role anon");
    await assert.rejects(db.exec("select * from public.editorial_media"));
    await assert.rejects(db.exec("select * from public.create_editorial_category('No access')"));
  } finally { await db.close(); }
});
