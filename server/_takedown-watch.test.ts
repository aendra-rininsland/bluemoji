import assert from "node:assert/strict";
import test from "node:test";
import { type Db, ensureStateTable, pollTakedowns } from "./_takedown-watch.ts";

/** Just enough of a SQL engine for the three statements the watcher issues. */
function fakeDb(initial: string[]) {
  let takendown = initial;
  let stored: string | undefined;
  const db: Db = {
    query: async (sql) => {
      if (sql.includes("FROM _repos")) return takendown.map((did) => ({ did }));
      if (sql.includes("cache_purge_state")) return stored === undefined ? [] : [{ value: stored }];
      return [];
    },
    run: async (sql, params) => {
      if (sql.includes("INSERT INTO cache_purge_state")) stored = params![1] as string;
    },
  };
  return {
    db,
    set: (d: string[]) => (takendown = d),
    stored: () => stored,
  };
}

test("first poll records a baseline and purges nothing", async () => {
  const f = fakeDb(["did:a"]);
  const seen: string[][] = [];
  const changed = await pollTakedowns(f.db, async (d) => void seen.push(d));
  assert.deepEqual(changed, []);
  assert.deepEqual(seen, []);
  assert.equal(f.stored(), JSON.stringify(["did:a"]));
});

test("reports new takedowns and reversals", async () => {
  const f = fakeDb(["did:a"]);
  await pollTakedowns(f.db, async () => {});

  f.set(["did:a", "did:b"]);
  assert.deepEqual(await pollTakedowns(f.db, async () => {}), ["did:b"]);

  f.set(["did:b"]);
  assert.deepEqual(await pollTakedowns(f.db, async () => {}), ["did:a"]);

  assert.deepEqual(await pollTakedowns(f.db, async () => {}), [], "no change, no purge");
});

test("does not record the new state if the purge hand-off fails", async () => {
  const f = fakeDb([]);
  await pollTakedowns(f.db, async () => {});
  f.set(["did:x"]);
  await assert.rejects(
    pollTakedowns(f.db, async () => {
      throw new Error("boom");
    }),
  );
  assert.equal(f.stored(), JSON.stringify([]), "stays behind so the next poll retries");
});

test("creates its state table idempotently", async () => {
  const sql: string[] = [];
  await ensureStateTable({ query: async () => [], run: async (s) => void sql.push(s) });
  assert.match(sql[0], /CREATE TABLE IF NOT EXISTS cache_purge_state/);
});
