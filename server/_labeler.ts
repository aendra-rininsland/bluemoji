// Underscore prefix keeps this module out of the server/ scanner.
//
// moji.blue's moderation labeler: signed ATProto labels (RFC 0007) about
// Bluemoji records and accounts, served from `com.atproto.label.queryLabels`.
// Everything here is plain TypeScript (no parameter properties or enums) because
// hatk loads it under `node --experimental-strip-types` in production.
import { Secp256k1Keypair, verifySignature } from "@atproto/crypto";
import { cborEncode } from "@atproto/common";

/** The label values this labeler publishes. Deliberately not the `!` system values (RFC 0007). */
export const LABEL_VALUES = [
  "bluemoji-takedown", // do not render: an account (DID) or one emoji (item URI)
  "bluemoji-adult", // the emoji is adult-only whatever its record says
  "bluemoji-abusive", // render as text and offer a report path
  "bluemoji-impersonation", // render as text and offer a report path
] as const;
export type LabelValue = (typeof LABEL_VALUES)[number];

export interface Label {
  ver: 1;
  src: string;
  uri: string;
  cid?: string;
  val: string;
  neg?: boolean;
  cts: string;
  exp?: string;
  sig?: Uint8Array;
}

export interface LabelerConfig {
  did: string;
  signingKeyHex: string;
}

/** Null (labeler disabled) unless both a DID and a signing key are configured. */
export function labelerConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): LabelerConfig | null {
  const did = env.LABELER_DID?.trim();
  const signingKeyHex = env.LABELER_SIGNING_KEY?.trim();
  if (!did || !signingKeyHex) return null;
  if (!/^did:(plc:[a-z2-7]{24}|web:[a-z0-9.-]+)$/i.test(did)) return null;
  if (!/^[0-9a-f]{64}$/i.test(signingKeyHex)) return null;
  return { did, signingKeyHex };
}

export function keypairFromHex(hex: string): Promise<Secp256k1Keypair> {
  return Secp256k1Keypair.import(hex);
}

/**
 * The bytes a label is signed over: DAG-CBOR of the label without `sig`,
 * absent fields omitted and `neg` present only when true (as the reference
 * labeler does), so any verifier reconstructs the same bytes.
 */
export function unsignedBytes(label: Label): Uint8Array {
  const obj: Record<string, unknown> = { ver: 1, src: label.src, uri: label.uri };
  if (label.cid) obj.cid = label.cid;
  obj.val = label.val;
  if (label.neg === true) obj.neg = true;
  obj.cts = label.cts;
  if (label.exp) obj.exp = label.exp;
  return cborEncode(obj);
}

export async function signLabel(label: Label, keypair: Secp256k1Keypair): Promise<Label> {
  return { ...label, sig: await keypair.sign(unsignedBytes(label)) };
}

/** Whether `label.sig` is a valid signature by the key `didKey` (a `did:key:…`). */
export async function verifyLabel(label: Label, didKey: string): Promise<boolean> {
  if (!label.sig) return false;
  try {
    return await verifySignature(didKey, unsignedBytes(label), label.sig);
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------- storage

export type LabelDb = {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  run: (sql: string, params?: unknown[]) => Promise<void>;
};

export async function ensureLabelTable(db: LabelDb) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS moderation_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uri TEXT NOT NULL,
      cid TEXT,
      val TEXT NOT NULL,
      neg INTEGER NOT NULL DEFAULT 0,
      cts TEXT NOT NULL,
      exp TEXT,
      sig TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'admin'
    )
  `);
  await db.run(
    `CREATE INDEX IF NOT EXISTS moderation_labels_subject ON moderation_labels (uri, val, id)`,
  );
}

interface Row {
  id: number;
  uri: string;
  cid: string | null;
  val: string;
  neg: number;
  cts: string;
  exp: string | null;
  sig: string;
  origin: string;
}

/**
 * Sign and append a label. Labels are immutable; lifting one means appending
 * the same (uri, val) with `neg: true`. `origin` is "sync" for labels derived
 * from account status (see reconcileTakedowns) and "admin" for a person's call.
 */
export async function appendLabel(
  db: LabelDb,
  config: LabelerConfig,
  keypair: Secp256k1Keypair,
  input: { uri: string; cid?: string; val: string; neg?: boolean; exp?: string; origin?: string },
  now: Date = new Date(),
): Promise<Label> {
  const label = await signLabel(
    {
      ver: 1,
      src: config.did,
      uri: input.uri,
      cid: input.cid,
      val: input.val,
      neg: input.neg === true ? true : undefined,
      cts: now.toISOString(),
      exp: input.exp,
    },
    keypair,
  );
  await db.run(
    `INSERT INTO moderation_labels (uri, cid, val, neg, cts, exp, sig, origin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      label.uri,
      label.cid ?? null,
      label.val,
      label.neg ? 1 : 0,
      label.cts,
      label.exp ?? null,
      Buffer.from(label.sig!).toString("base64"),
      input.origin ?? "admin",
    ],
  );
  return label;
}

/** A label as it goes over the wire: `sig` as `{ $bytes }`, `neg` only when true. */
export function wireLabel(row: Row, src: string) {
  return {
    ver: 1,
    src,
    uri: row.uri,
    ...(row.cid ? { cid: row.cid } : {}),
    val: row.val,
    ...(row.neg ? { neg: true } : {}),
    cts: row.cts,
    ...(row.exp ? { exp: row.exp } : {}),
    sig: { $bytes: row.sig },
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * The current label for each (uri, val) matching the patterns, negations
 * included so a consumer can see that something was lifted. Expired labels are
 * left out. A pattern is a full URI/DID, or a prefix ending in `*`.
 */
export async function queryLabels(
  db: LabelDb,
  src: string,
  opts: { patterns: string[]; sources?: string[]; limit?: number; cursor?: string },
  now: Date = new Date(),
): Promise<{ labels: ReturnType<typeof wireLabel>[]; cursor?: string }> {
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 50), 1), 250);
  if (opts.sources?.length && !opts.sources.includes(src)) return { labels: [] };
  if (!opts.patterns.length) return { labels: [] };

  const params: unknown[] = [];
  const next = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const patterns = opts.patterns.map((p) =>
    p.endsWith("*")
      ? `l.uri LIKE ${next(escapeLike(p.slice(0, -1)) + "%")} ESCAPE '\\'`
      : `l.uri = ${next(p)}`,
  );
  const after = Number(opts.cursor);
  const where = [
    `l.id = (SELECT MAX(id) FROM moderation_labels WHERE uri = l.uri AND val = l.val)`,
    `(${patterns.join(" OR ")})`,
    `(l.exp IS NULL OR l.exp > ${next(now.toISOString())})`,
  ];
  if (opts.cursor && Number.isFinite(after)) where.push(`l.id > ${next(after)}`);

  const rows = (await db.query(
    `SELECT l.* FROM moderation_labels l WHERE ${where.join(" AND ")} ORDER BY l.id ASC LIMIT ${limit}`,
    params,
  )) as Row[];
  return {
    labels: rows.map((r) => wireLabel(r, src)),
    cursor: rows.length === limit ? String(rows[rows.length - 1].id) : undefined,
  };
}

/**
 * Keep `bluemoji-takedown` labels on accounts in step with hatk's
 * `_repos.status`, which the /admin routes flip with no hook to attach to. An
 * account taken down gets the label, a reinstated one gets it negated. This
 * only manages labels it created itself (`origin = 'sync'`): if a person has
 * labelled or lifted an account by hand, that call stands.
 */
export async function reconcileTakedowns(
  db: LabelDb,
  config: LabelerConfig,
  keypair: Secp256k1Keypair,
  now: Date = new Date(),
): Promise<{ labelled: string[]; lifted: string[] }> {
  const down = new Set(
    (
      (await db.query(`SELECT did FROM _repos WHERE status = 'takendown'`)) as { did: string }[]
    ).map((r) => r.did),
  );
  const latest = (await db.query(
    `SELECT l.uri, l.neg, l.origin FROM moderation_labels l
     WHERE l.val = 'bluemoji-takedown' AND l.uri LIKE 'did:%'
       AND l.id = (SELECT MAX(id) FROM moderation_labels WHERE uri = l.uri AND val = l.val)`,
  )) as { uri: string; neg: number; origin: string }[];
  const byUri = new Map(latest.map((r) => [r.uri, r]));

  const labelled: string[] = [];
  const lifted: string[] = [];
  for (const did of down) {
    const cur = byUri.get(did);
    if (cur && cur.origin !== "sync") continue; // a person decided; leave it
    if (!cur || cur.neg) {
      await appendLabel(
        db,
        config,
        keypair,
        { uri: did, val: "bluemoji-takedown", origin: "sync" },
        now,
      );
      labelled.push(did);
    }
  }
  for (const cur of latest) {
    if (cur.origin !== "sync" || cur.neg || down.has(cur.uri)) continue;
    await appendLabel(
      db,
      config,
      keypair,
      { uri: cur.uri, val: "bluemoji-takedown", neg: true, origin: "sync" },
      now,
    );
    lifted.push(cur.uri);
  }
  return { labelled, lifted };
}
