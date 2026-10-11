// Run after changing schema/defaults; committed SQL is standalone for Supabase.
import { readFile, writeFile } from "node:fs/promises";
import { landingSchema, createDefaultLandingDocument } from "./index.mjs";
const path = new URL("../../supabase/landing_page_editor_patch.sql", import.meta.url);
const source = await readFile(path, "utf8");
await writeFile(path, source
  .replace(/\$schema\$[\s\S]*?\$schema\$/, () => `$schema$${JSON.stringify(landingSchema)}$schema$`)
  .replace(/\$default\$[\s\S]*?\$default\$/, () => `$default$${JSON.stringify(createDefaultLandingDocument())}$default$`));
