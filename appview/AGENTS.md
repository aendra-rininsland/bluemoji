# AppView Starter

This is a starter project for building an AT Protocol AppView using the hatk framework.

## AT Protocol Concepts

**Architecture:** PDS (stores user data) -> Relay (aggregates events) -> AppView (indexes, enriches, serves) -> Client

**Identity chain:** Handle (alice.bsky.social) -> DID (did:plc:abc123) -> PDS endpoint (https://pds.example.com). The PLC Directory at plc.directory maps between these.

**Records** are stored in user repositories on their PDS, organized by collection (e.g., `xyz.statusphere.status`). Each record has a URI: `at://{did}/{collection}/{rkey}`

**Firehose** is a WebSocket stream from the Relay containing all record creates/updates/deletes across the network. The four event types are `#commit` (record ops), `#identity` (handle/DID changes), `#account` (status changes), `#sync` (repo reset).

**Lexicons** are JSON schemas that define record types, queries (GET endpoints), and procedures (POST endpoints). They live in `lexicons/` and are namespaced by reverse domain: `xyz.statusphere.*`

**XRPC** is HTTP with lexicon-typed endpoints served at `/xrpc/{nsid}`. Queries are GET, procedures are POST.

**Hydration** enriches raw database rows into client-ready views -- adding author profiles, counts, viewer context (what the logged-in user has done: liked, bookmarked, etc). Always batch load by type, never N+1.

**Record writes** are proxied through the user's PDS via createRecord/putRecord/deleteRecord. The AppView indexes optimistically after a successful PDS response -- don't wait for the firehose round-trip.

## hatk Framework

hatk is a convention-driven framework for building AT Protocol AppViews.

### Key conventions

- **Lexicons** go in `lexicons/`. hatk auto-generates SQLite tables, TypeScript types, and validation from them.
- **Feeds** go in `server/`. Export `defineFeed()` -- hatk handles pagination and cursor encoding.
- **XRPC handlers** go in `server/`. Export `defineQuery()` or `defineProcedure()`.
- **Hooks** like `server/on-login.ts` run on events (login, record create, etc).
- **Labels** go in `server/labels/`. Export `defineLabel()`.
- **Frontend** (SvelteKit) goes in `app/`. Use `$hatk/client` for `callXrpc()` and auth helpers.

### Generated files (don't edit)

- `hatk.generated.ts` -- server types, `defineFeed`, `defineQuery`, `defineProcedure`
- `hatk.generated.client.ts` -- client types, `callXrpc`, auth helpers

### Important imports

```typescript
// Server-side (feeds, xrpc handlers, hooks)
import { defineFeed, defineQuery, defineProcedure, defineHook } from "$hatk";

// Client-side (SvelteKit pages, components)
import { callXrpc, parseViewer, login, logout } from "$hatk/client";
```

### Common patterns

**Feed handler:**

```typescript
import { defineFeed } from "$hatk";

export default defineFeed({
  collection: "xyz.statusphere.status",
  label: "Recent",
  async generate(ctx) {
    const { rows, cursor } = await ctx.paginate(
      `SELECT uri, cid, indexed_at FROM "xyz.statusphere.status"`,
      { orderBy: "created_at", order: "DESC" },
    );
    return ctx.ok({ uris: rows.map((r) => r.uri), cursor });
  },
});
```

**Feed with hydration:**

```typescript
import { defineFeed, type BaseContext, type Row } from "$hatk";

async function hydrate(ctx: BaseContext, items: Row<Status>[]) {
  const dids = [...new Set(items.map((i) => i.did))];
  const [profiles, labels] = await Promise.all([
    ctx.lookup("app.bsky.actor.profile", "did", dids),
    ctx.labels(items.map((i) => i.uri)),
  ]);
  return items.map((item) => ({
    ...item.value,
    uri: item.uri,
    author: profiles.get(item.did),
    labels: labels.get(item.uri) ?? [],
  }));
}

export default defineFeed({
  collection: "xyz.statusphere.status",
  label: "Recent",
  hydrate,
  async generate(ctx) {
    const { rows, cursor } = await ctx.paginate(
      `SELECT uri, cid, indexed_at FROM "xyz.statusphere.status"`,
      { orderBy: "created_at", order: "DESC" },
    );
    return ctx.ok({ uris: rows.map((r) => r.uri), cursor });
  },
});
```

**Query handler:**

```typescript
import { defineQuery } from "$hatk";

export default defineQuery("xyz.statusphere.getStatuses", async (ctx) => {
  const { ok, params, db } = ctx;
  const rows = db.query(
    'SELECT * FROM "xyz.statusphere.status" ORDER BY created_at DESC LIMIT $1',
    [params.limit || 25],
  );
  return ok({ statuses: rows });
});
```

**Procedure handler (with auth):**

```typescript
import { defineProcedure } from "$hatk";

export default defineProcedure("xyz.statusphere.doSomething", async (ctx) => {
  const { ok, viewer, input } = ctx;
  if (!viewer) throw new Error("Auth required");
  // do something with input
  return ok({});
});
```

**On-login hook:**

```typescript
import { defineHook } from "$hatk";

export default defineHook("on-login", async (ctx) => {
  const { did, ensureRepo } = ctx;
  // Backfill the user's repo so their data is indexed
  await ensureRepo(did);
});
```

**Label definition:**

```typescript
import { defineLabel } from "$hatk";

export default defineLabel({
  definition: {
    identifier: "spam",
    severity: "inform",
    blurs: "content",
    defaultSetting: "warn",
    locales: [{ lang: "en", name: "Spam", description: "Spam content." }],
  },
});
```

### XRPC handler ctx reference

- `ctx.ok(data)` -- return successful response
- `ctx.params` -- query parameters (GET)
- `ctx.input` -- request body (POST)
- `ctx.viewer` -- authenticated user `{ did, handle }` or null
- `ctx.db.query(sql, params)` -- execute SQL with `$1, $2` placeholders
- `ctx.lookup(collection, field, values)` -- batch lookup records by field, returns `Map`
- `ctx.count(collection, field, values)` -- aggregate counts, returns `Map`
- `ctx.labels(uris)` -- get labels for URIs, returns `Map<string, Label[]>`
- `ctx.blobUrl(did, cid)` -- generate blob URL
- `ctx.createRecord(collection, record, opts?)` -- create a record via user's PDS
- `ctx.deleteRecord(collection, rkey)` -- delete a record via user's PDS

### Database queries

Always quote table names (they contain dots):

```sql
SELECT * FROM "xyz.statusphere.status" WHERE did = $1
```

Use table aliases and prefix columns in JOINs and subqueries to avoid ambiguity:

```sql
SELECT t.uri, t.cid, t.created_at
FROM "xyz.statusphere.status" t
LEFT JOIN _repos r ON t.did = r.did
WHERE r.status IS NULL OR r.status != 'takendown'
```

Use `$1, $2, ...` placeholders, never string interpolation:

```typescript
const rows = ctx.db.query(
  `SELECT * FROM "xyz.statusphere.status" WHERE did = $1 AND created_at > $2`,
  [did, since],
);
```

Dynamic IN clauses:

```typescript
const placeholders = uris.map((_, i) => `$${i + 1}`).join(",");
const rows = ctx.db.query(
  `SELECT * FROM "xyz.statusphere.status" WHERE uri IN (${placeholders})`,
  uris,
);
```

### Viewer context

`ctx.viewer` is `{ did: string, handle?: string } | null`. It's the logged-in user, resolved from the OAuth session cookie. It is **not** automatically required -- you must check for it in handlers that need auth.

On the server, use `ctx.viewer?.did` in hydration to add "what has this viewer done" context:

```typescript
// Check if the viewer has favorited each item
const viewerFavs = new Map<string, string>();
if (ctx.viewer?.did && uris.length > 0) {
  const rows = await ctx.db.query(
    `SELECT subject, uri FROM "xyz.statusphere.favorite"
     WHERE did = $1 AND subject IN (${uris.map((_, i) => `$${i + 2}`).join(",")})`,
    [ctx.viewer.did, ...uris],
  );
  for (const row of rows) viewerFavs.set(row.subject, row.uri);
}

// Include in hydrated view
return items.map((item) => ({
  ...item.value,
  uri: item.uri,
  viewerFav: viewerFavs.get(item.uri) ?? null,
}));
```

On the client, viewer comes from layout data (see SvelteKit authentication below). Access it in pages via `data.viewer` from the layout load.

### SvelteKit authentication

**Layout data (app/routes/+layout.server.ts):**

```typescript
import { parseViewer } from "$hatk/client";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies }) => {
  const viewer = await parseViewer(cookies);
  return { viewer };
};
```

**Protected routes:**

```typescript
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
  const { viewer } = await parent();
  if (!viewer) throw redirect(302, "/");
};
```

**Login/logout from components:**

```typescript
import { login, logout } from "$hatk/client";

// Login redirects through OAuth
await login("alice.bsky.social");

// Logout clears session
await logout();
```

### Frontend record mutations

**Create a record:**

```typescript
import { callXrpc } from "$hatk/client";

const result = await callXrpc("dev.hatk.createRecord", {
  collection: "xyz.statusphere.status",
  record: { status: "👍", createdAt: new Date().toISOString() },
});
```

**Delete a record:**

```typescript
await callXrpc("dev.hatk.deleteRecord", {
  collection: "xyz.statusphere.status",
  rkey: uri.split("/").pop(),
});
```

### CLI commands

- `vp dev` -- starts local PDS (Docker), seeds data, starts hatk with file watching
- `vp build` -- build frontend for production
- `vp check` -- lint and type-check (add `&& svelte-check` for Svelte diagnostics)
- `vp test` -- run tests
- `hatk generate types` -- regenerate TypeScript types from lexicons
- `hatk generate record xyz.statusphere.newRecord` -- scaffold a new record lexicon
- `hatk generate query xyz.statusphere.getThings` -- scaffold a query lexicon
- `hatk generate feed myFeed` -- scaffold a feed handler
- `hatk seed` -- re-run seed data
- `hatk reset` -- wipe database and PDS, start fresh

### Config

`hatk.config.ts` sets relay URL, PLC directory, database path, port, backfill options, OAuth settings.
