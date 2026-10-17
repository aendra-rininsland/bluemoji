// Runs a batch of emoji imports with limited concurrency and optional pack
// membership. Shared by the Mastodon and zip importers. Network operations
// are injected so the logic is testable without a browser or PDS.
import type { PackTarget } from "./packs";

export interface ImportResult {
  uri: string;
  /** Set when the emoji imported but not exactly as asked (e.g. animation dropped). */
  warning?: string;
}

export type ItemStatus =
  | { state: "pending" }
  | { state: "working" }
  | { state: "done"; message?: string }
  | { state: "error"; message: string };

export interface QueueItem {
  key: string;
  run: () => Promise<ImportResult>;
}

export interface RunnerOptions {
  did: string;
  items: QueueItem[];
  pack: PackTarget;
  /** Applied to a newly created pack */
  adultOnly: boolean;
  createPack: (
    did: string,
    name: string,
    description: string,
    adultOnly: boolean,
    provenance?: { license?: string; source?: string },
  ) => Promise<string>;
  addToPack: (did: string, packUri: string, itemUri: string) => Promise<void>;
  onStatus: (key: string, status: ItemStatus) => void;
  concurrency?: number;
}

export interface RunSummary {
  done: string[];
  failed: string[];
  /** The pack used, if any (a new pack is created lazily, after the first success) */
  packUri?: string;
}

export async function runImportQueue(o: RunnerOptions): Promise<RunSummary> {
  const done: string[] = [];
  const failed: string[] = [];
  let packUri = o.pack.mode === "existing" ? o.pack.uri : "";

  // Created lazily so a run where everything fails leaves no empty pack behind,
  // and memoised so concurrent workers share one creation.
  let creating: Promise<string> | null = null;
  const ensurePack = (): Promise<string> => {
    if (packUri) return Promise.resolve(packUri);
    creating ??= o
      .createPack(o.did, o.pack.name, o.pack.description, o.adultOnly, {
        license: o.pack.license,
        source: o.pack.source,
      })
      .then((u) => (packUri = u));
    return creating;
  };

  for (const item of o.items) o.onStatus(item.key, { state: "pending" });

  let next = 0;
  async function worker() {
    while (next < o.items.length) {
      const item = o.items[next++];
      o.onStatus(item.key, { state: "working" });
      let result: ImportResult;
      try {
        result = await item.run();
      } catch (e) {
        failed.push(item.key);
        o.onStatus(item.key, {
          state: "error",
          message: e instanceof Error ? e.message : "Import failed",
        });
        continue;
      }
      done.push(item.key);
      let message = result.warning;
      if (o.pack.mode !== "none") {
        try {
          await o.addToPack(o.did, await ensurePack(), result.uri);
        } catch (e) {
          const why = `not added to pack: ${e instanceof Error ? e.message : "could not add to pack"}`;
          message = [result.warning, why].filter(Boolean).join("; ");
        }
      }
      o.onStatus(item.key, { state: "done", message });
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, o.concurrency ?? 2) }, worker));
  return { done, failed, packUri: packUri || undefined };
}
