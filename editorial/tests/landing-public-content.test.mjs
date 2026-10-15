import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultLandingDocument, validateLandingDocument } from "../../packages/landing-page/index.mjs";
import { preparePublicLandingDocument, publicArticleCatalogUrl } from "../../packages/landing-page/public-content.mjs";

test("article catalogs use the public site in editorial previews and local routes on the main site", () => {
  for (const url of ["/artikel", "https://editorial.rabbaniinstitute.id/artikel", "https://rabbaniinstitute.id/artikel/"]) {
    assert.equal(publicArticleCatalogUrl(url), "https://www.rabbaniinstitute.id/artikel");
    assert.equal(publicArticleCatalogUrl(url, "/artikel"), "/artikel");
  }
  assert.equal(publicArticleCatalogUrl("https://editorial.rabbaniinstitute.id/artikel?topik=arab#daftar", "/artikel"), "/artikel?topik=arab#daftar");
  for (const url of ["https://example.com/artikel", "https://editorial.rabbaniinstitute.id/artikel/123", "https://editorial.rabbaniinstitute.id:8443/artikel", "//editorial.rabbaniinstitute.id/artikel", "javascript:alert(1)", "", undefined]) {
    assert.equal(publicArticleCatalogUrl(url), url);
  }
});

test("old stored landing content is adapted without mutating drafts or publication history", () => {
  const stored = createDefaultLandingDocument();
  const courses = stored.blocks.find((block) => block.type === "courses");
  courses.props.description = "Pilih kelas, daftar, lalu simpan progress belajar langsung di Supabase.";
  const articles = stored.blocks.find((block) => block.type === "articles");
  articles.props.catalogUrl = "https://editorial.rabbaniinstitute.id/artikel";
  const before = structuredClone(stored);
  const adapted = preparePublicLandingDocument(stored, "/artikel");
  assert.deepEqual(stored, before);
  assert.match(adapted.blocks.find((block) => block.type === "courses").props.description, /progres terakhir/);
  assert.equal(adapted.blocks.find((block) => block.type === "articles").props.catalogUrl, "/artikel");
  assert.deepEqual(validateLandingDocument(adapted), adapted);
  assert.deepEqual(preparePublicLandingDocument(adapted, "/artikel"), adapted);
});

test("custom editorial copy and optional catalog settings are preserved", () => {
  const doc = createDefaultLandingDocument();
  doc.blocks.find((block) => block.type === "courses").props.description = "Kelas pilihan redaksi untuk pemula.";
  delete doc.blocks.find((block) => block.type === "articles").props.catalogUrl;
  const adapted = preparePublicLandingDocument(doc);
  assert.deepEqual(adapted, doc);
  assert.deepEqual(validateLandingDocument(adapted), adapted);
});
