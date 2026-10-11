# Landing page contract

Shared framework-independent package for Editorial and the main Rabbani site.
Schema version 1 includes nine supported block types; default content mirrors
the current homepage's six sections. No public renderer is switched in phase 1.

Editorial imports `../../packages/landing-page/index.mjs` through its
`lib/landing-document.mjs` facade. The main app can import the same package
from `../packages/landing-page/index.mjs` in its future renderer. Relative
imports avoid introducing a second dependency installation for this local
package. Vercel must include files outside Editorial's root (already enabled).

`validateLandingDocument` rejects extra keys, unknown types, unsafe URLs,
duplicate IDs, more than 40 blocks, depth over 16, over 5,000 JSON nodes, or
documents over 256 KiB. Optional media and SEO URLs may be blank in drafts.
SQL additionally counts JSONB serialization bytes, so its size check can be
slightly more conservative than compact JSON. Publish-specific completeness,
semantic rich text checks, reference resolution, and SEO checks are phase 4.

After changing the schema/default, run:

```powershell
node packages/landing-page/sync-sql.mjs
```

This updates the embedded schema/default inside the standalone Supabase patch.
Tests verify the committed SQL matches the package. Never change version 1's
contract incompatibly; add a new schema version and migrate explicitly.

The migration initializes a private draft, never a public snapshot. Drafts
and revisions are admin-only; anonymous readers see only the publication
table. All mutations use role-checked RPCs, expected versions, and row locks.
Authenticated clients cannot update/delete snapshots or publish by writing
tables directly. Repeated publish calls for the same version reuse the revision.
All future actions/API handlers must independently call `requireLandingAdmin`;
a layout guard alone does not secure a server action.
