import assert from "node:assert/strict";
import { runImportQueue, type ItemStatus, type QueueItem } from "./import-runner.ts";
import { packTargetProblem, type PackTarget } from "./packs.ts";

const none: PackTarget = { mode: "none", uri: "", name: "", description: "" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function harness(
  over: Partial<Parameters<typeof runImportQueue>[0]> = {},
  pack: PackTarget = none,
) {
  const statuses: Record<string, ItemStatus> = {};
  const log = { created: [] as unknown[][], added: [] as string[][], active: 0, maxActive: 0 };
  const opts = {
    did: "did:plc:me",
    items: [] as QueueItem[],
    pack,
    adultOnly: false,
    createPack: async (...a: any[]) => {
      log.created.push(a);
      await sleep(5);
      return "at://did:plc:me/blue.moji.packs.pack/new1";
    },
    addToPack: async (_d: string, p: string, i: string) => {
      log.added.push([p, i]);
    },
    onStatus: (k: string, s: ItemStatus) => {
      statuses[k] = s;
    },
    ...over,
  };
  return { opts, statuses, log };
}
const item = (key: string, over: Partial<QueueItem> = {}): QueueItem => ({
  key,
  run: async () => ({ uri: `at://did:plc:me/blue.moji.collection.item/${key}` }),
  ...over,
});

// 1. concurrency is capped, every item reaches a final state
{
  const h = harness();
  const items = ["a", "b", "c", "d", "e"].map((k) =>
    item(k, {
      run: async () => {
        h.log.active++;
        h.log.maxActive = Math.max(h.log.maxActive, h.log.active);
        await sleep(10);
        h.log.active--;
        return { uri: `u/${k}` };
      },
    }),
  );
  const r = await runImportQueue({ ...h.opts, items, concurrency: 2 });
  assert.equal(h.log.maxActive, 2);
  assert.deepEqual(r.done.sort(), ["a", "b", "c", "d", "e"]);
  assert.ok(Object.values(h.statuses).every((s) => s.state === "done"));
  assert.equal(h.log.created.length, 0, "no pack when mode is none");
}
console.log("ok - bounded concurrency, all items finish");

// 2. a new pack is created exactly once, lazily, with the right args, and every success is added
{
  const pack: PackTarget = {
    mode: "new",
    uri: "",
    name: "My Pack",
    description: "from zip",
    license: "CC-BY-4.0",
    source: "https://example.com/pack",
  };
  const h = harness({ adultOnly: true }, pack);
  const items = ["a", "b", "c", "d"].map((k) => item(k));
  const r = await runImportQueue({ ...h.opts, items });
  assert.equal(h.log.created.length, 1, "created once despite concurrent workers");
  assert.deepEqual(h.log.created[0], [
    "did:plc:me",
    "My Pack",
    "from zip",
    true,
    { license: "CC-BY-4.0", source: "https://example.com/pack" },
  ]);
  assert.equal(h.log.added.length, 4);
  assert.ok(h.log.added.every(([p]) => p === "at://did:plc:me/blue.moji.packs.pack/new1"));
  assert.equal(r.packUri, "at://did:plc:me/blue.moji.packs.pack/new1");
}
console.log("ok - new pack created once, lazily, with all successes added");

// 3. nothing succeeds => no empty pack is created
{
  const h = harness({}, { mode: "new", uri: "", name: "P", description: "" });
  const r = await runImportQueue({
    ...h.opts,
    items: [
      item("a", {
        run: async () => {
          throw new Error("boom");
        },
      }),
    ],
  });
  assert.equal(h.log.created.length, 0);
  assert.deepEqual(r.failed, ["a"]);
  assert.deepEqual(h.statuses.a, { state: "error", message: "boom" });
  assert.equal(r.packUri, undefined);
}
console.log("ok - all-failures leaves no empty pack");

// 4. existing pack: used as-is, never created; a failed add is reported but the import counts as done
{
  const pack: PackTarget = {
    mode: "existing",
    uri: "at://did:plc:me/blue.moji.packs.pack/old",
    name: "",
    description: "",
  };
  const h = harness(
    {
      addToPack: async () => {
        throw new Error("pack full");
      },
    },
    pack,
  );
  const r = await runImportQueue({
    ...h.opts,
    items: [item("a", { run: async () => ({ uri: "u", warning: "animation skipped: x" }) })],
  });
  assert.equal(h.log.created.length, 0);
  assert.deepEqual(r.done, ["a"]);
  assert.deepEqual(h.statuses.a, {
    state: "done",
    message: "animation skipped: x; not added to pack: pack full",
  });
}
console.log("ok - existing pack used; add-to-pack failure reported without failing the import");

// 5. one failure doesn't stop the rest; warnings pass through
{
  const h = harness();
  const items = [
    item("a"),
    item("b", {
      run: async () => {
        throw new Error("nope");
      },
    }),
    item("c", { run: async () => ({ uri: "u", warning: "w" }) }),
  ];
  const r = await runImportQueue({ ...h.opts, items });
  assert.deepEqual(r.done.sort(), ["a", "c"]);
  assert.deepEqual(r.failed, ["b"]);
  assert.deepEqual(h.statuses.c, { state: "done", message: "w" });
}
console.log("ok - failures are isolated; warnings are kept");

// packTargetProblem
assert.equal(packTargetProblem(none), null);
assert.equal(
  packTargetProblem({ mode: "existing", uri: "", name: "", description: "" }),
  "Choose a pack",
);
assert.equal(
  packTargetProblem({ mode: "existing", uri: "at://x", name: "", description: "" }),
  null,
);
assert.match(packTargetProblem({ mode: "new", uri: "", name: " ", description: "" }) ?? "", /name/);
assert.equal(packTargetProblem({ mode: "new", uri: "", name: "Ok", description: "" }), null);
assert.match(
  packTargetProblem({ mode: "new", uri: "", name: "Ok", description: "a".repeat(301) }) ?? "",
  /too long/,
);
console.log("import-runner tests passed");
