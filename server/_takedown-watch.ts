// Underscore prefix keeps this module out of the server/ scanner.

/**
 * hatk applies and reverses account takedowns from its own /admin routes by
 * updating `_repos.status`, with no hook to attach to. Rather than patch the
 * framework, notice the change: compare the set of taken-down DIDs with the one
 * stored last time. This also catches a takedown made while this process was
 * down, which an in-memory listener would miss.
 *
 * The first run only records a baseline, so enabling purging does not flush the
 * whole cache.
 */
export type Db = {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  run: (sql: string, params?: unknown[]) => Promise<void>;
};

const KEY = "takendown_dids";

export async function ensureStateTable(db: Db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS cache_purge_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

/** DIDs whose takedown status changed since the last poll (either direction). */
export async function pollTakedowns(
  db: Db,
  onChanged: (dids: string[]) => Promise<void>,
): Promise<string[]> {
  const current = (
    (await db.query(`SELECT did FROM _repos WHERE status = 'takendown'`)) as { did: string }[]
  ).map((r) => r.did);

  const saved = (await db.query(`SELECT value FROM cache_purge_state WHERE key = $1`, [KEY])) as {
    value: string;
  }[];

  let changed: string[] = [];
  if (saved.length) {
    const previous = new Set<string>(JSON.parse(saved[0].value));
    const now = new Set(current);
    changed = [
      ...current.filter((d) => !previous.has(d)),
      ...[...previous].filter((d) => !now.has(d)),
    ];
    // Hand off before recording, so a crash in between re-purges (harmless)
    // instead of skipping the purge.
    if (changed.length) await onChanged(changed);
  }

  await db.run(
    `INSERT INTO cache_purge_state (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [KEY, JSON.stringify(current)],
  );
  return changed;
}
