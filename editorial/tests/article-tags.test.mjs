import test from "node:test";
import assert from "node:assert/strict";
import { normalizeArticleTag, parseArticleTags, serializeArticleTags } from "../lib/article-tags.mjs";

test("tag artikel dinormalisasi dan dipisahkan dengan koma", () => {
  assert.equal(normalizeArticleTag("  ilmu   hadis "), "ilmu hadis");
  assert.deepEqual(parseArticleTags(" ilmu,hadis, ilmu, , fikih "), ["ilmu", "hadis", "fikih"]);
  assert.deepEqual(parseArticleTags("aqidah，sirah"), ["aqidah", "sirah"]);
  assert.equal(serializeArticleTags(["ilmu", " hadis "]), "ilmu, hadis");
});
