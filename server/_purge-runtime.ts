// Underscore prefix keeps this module out of the server/ scanner.
import { rkeyToAlias } from "../app/lib/alias.ts";
import { CloudflarePurger, getItemUrls, purgeConfigFromEnv } from "./_cache-purge.ts";

/** Shared by the on-commit hook and the takedown watcher. */
export const purger = new CloudflarePurger(purgeConfigFromEnv());

type Query = (sql: string, params?: unknown[]) => Promise<unknown[]>;

const ITEM_TABLE = '"blue.moji.collection.item"';

async function handleFor(query: Query, did: string): Promise<string | null> {
  const rows = (await query(`SELECT handle FROM _repos WHERE did = $1`, [did])) as {
    handle: string | null;
  }[];
  return rows[0]?.handle ?? null;
}

/** Queue a purge of getItem for one emoji. `name` may be an alias or colon-wrapped. */
export async function purgeItem(query: Query, did: string, name: string) {
  if (!purger.enabled) return;
  const handle = await handleFor(query, did);
  try {
    purger.enqueue(
      getItemUrls(
        process.env.PUBLIC_ORIGIN ?? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
        handle ? [did, handle] : [did],
        name,
      ),
    );
  } catch {
    // An unparseable alias was never a valid lookup, so nothing can be cached for it.
  }
}

/** Queue a purge of getItem for every emoji an account owns. */
export async function purgeAccount(query: Query, did: string) {
  if (!purger.enabled) return;
  const rows = (await query(`SELECT name FROM ${ITEM_TABLE} WHERE did = $1`, [did])) as {
    name: string;
  }[];
  for (const row of rows) await purgeItem(query, did, row.name);
}

/** The alias for a record that no longer exists, from its AT-URI. */
export function aliasFromUri(uri: string): string {
  return rkeyToAlias(uri.slice(uri.lastIndexOf("/") + 1));
}
