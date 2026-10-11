import { normalizeEditorPayload } from "./editor-document.mjs";

export function newArticleSlug(creationKey) {
  if (typeof creationKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(creationKey)) throw new Error("Identitas draft tidak valid. Muat ulang editor.");
  return `artikel-${creationKey.toLowerCase()}`;
}

export function normalizeNewArticlePayload(input) {
  newArticleSlug(input?.creationKey);
  return normalizeEditorPayload({ ...input, id: "1", version: 1, title: typeof input.title === "string" && !input.title.trim() ? "Tanpa judul" : input.title });
}
