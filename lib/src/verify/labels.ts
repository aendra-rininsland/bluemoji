/**
 * Moderation labels (RFC 0007) as a consumer: ask the labelers you trust whether
 * they have labelled an emoji or its owner, and believe only what is signed.
 *
 * A labeler is a DID. Its DID document names where it serves labels
 * (`#atproto_labeler`) and the key it signs them with (`#atproto_label`). A
 * label is accepted only if it was issued by that DID, is about the subject we
 * asked for, hasn't expired, and its signature verifies against that key. The
 * labeler's own server is never trusted to vouch for itself.
 */
import { verifySignature } from "@atproto/crypto";
import { allowedUrl, getJson, type HttpOptions } from "./http";

export const LABEL_TAKEDOWN = "bluemoji-takedown";
export const LABEL_ADULT = "bluemoji-adult";
export const LABEL_ABUSIVE = "bluemoji-abusive";
export const LABEL_IMPERSONATION = "bluemoji-impersonation";

/** A labeler to trust: a DID (endpoint and key come from its DID document), or pinned explicitly. */
export type LabelerRef = string | { did: string; endpoint?: string; key?: string };

export interface WireLabel {
  ver?: number;
  src: string;
  uri: string;
  cid?: string;
  val: string;
  neg?: boolean;
  cts: string;
  exp?: string;
  sig?: { $bytes: string };
}

// ---------------------------------------------------------------- signatures

const text = new TextEncoder();

function head(major: number, n: number): number[] {
  if (n < 24) return [(major << 5) | n];
  if (n < 0x100) return [(major << 5) | 24, n];
  return [(major << 5) | 25, n >> 8, n & 0xff]; // labels are far below 64KiB
}

function cborString(s: string): number[] {
  const bytes = text.encode(s);
  return [...head(3, bytes.length), ...bytes];
}

/**
 * The bytes a label is signed over: DAG-CBOR of the label without `sig`, with
 * absent fields omitted and `neg` present only when true. Hand-rolled (a flat
 * map of strings, one small int and one bool) so the package needs no CBOR
 * library; the tests check it byte for byte against the reference encoder.
 */
export function encodeLabel(label: WireLabel): Uint8Array {
  const fields: [string, number[]][] = [
    ["ver", [1]],
    ["src", cborString(label.src)],
    ["uri", cborString(label.uri)],
    ["val", cborString(label.val)],
    ["cts", cborString(label.cts)],
  ];
  if (label.cid) fields.push(["cid", cborString(label.cid)]);
  if (label.neg === true) fields.push(["neg", [0xf5]]);
  if (label.exp) fields.push(["exp", cborString(label.exp)]);

  // DAG-CBOR map keys sort by length, then bytewise
  fields.sort(([a], [b]) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
  const out: number[] = head(5, fields.length);
  for (const [key, value] of fields) out.push(...cborString(key), ...value);
  return Uint8Array.from(out);
}

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Whether `label.sig` is a valid signature over the label by `didKey` (a `did:key:…`). */
export async function verifyLabelSignature(label: WireLabel, didKey: string): Promise<boolean> {
  const sig = label.sig?.$bytes ? base64ToBytes(label.sig.$bytes) : null;
  if (!sig) return false;
  try {
    return await verifySignature(didKey, encodeLabel(label), sig);
  } catch {
    return false;
  }
}

// ------------------------------------------------------------ finding a labeler

export interface LabelerInfo {
  did: string;
  endpoint: string;
  /** `did:key:…` the labeler signs with. */
  didKey: string;
}

const LABELER_TTL_MS = 60 * 60 * 1000;
const resolved = new Map<string, { info: LabelerInfo | null; expires: number }>();

/** Test hook. */
export function clearLabelCaches() {
  resolved.clear();
  verdicts.clear();
}

const DID_RE = /^did:(plc:[a-z2-7]{24}|web:[a-z0-9.-]+)$/i;

export interface LabelOptions extends HttpOptions {
  /** Defaults to https://plc.directory. */
  plcUrl?: string;
  /** How long to remember a labeler's answer for a subject. Default 60s; 0 disables. */
  labelCacheTtlMs?: number;
}

/** Read a labeler's endpoint and signing key from its DID document (or use the pinned values). */
export async function resolveLabeler(
  ref: LabelerRef,
  opts: LabelOptions,
): Promise<LabelerInfo | null> {
  const did = typeof ref === "string" ? ref : ref.did;
  if (!DID_RE.test(did)) return null;
  const pinned: { endpoint?: string; key?: string } = typeof ref === "string" ? {} : ref;
  if (pinned.endpoint && pinned.key) {
    return { did, endpoint: pinned.endpoint, didKey: normaliseKey(pinned.key) };
  }

  const cacheKey = `${opts.plcUrl ?? ""}|${did}`;
  const hit = resolved.get(cacheKey);
  let info = hit && hit.expires > Date.now() ? hit.info : undefined;
  if (info === undefined) {
    info = await readDidDocument(did, opts).catch(() => null);
    resolved.set(cacheKey, { info, expires: Date.now() + LABELER_TTL_MS });
  }
  if (!info) return null;
  return {
    did,
    endpoint: pinned.endpoint ?? info.endpoint,
    didKey: pinned.key ? normaliseKey(pinned.key) : info.didKey,
  };
}

const normaliseKey = (k: string) => (k.startsWith("did:key:") ? k : `did:key:${k}`);

async function readDidDocument(did: string, opts: LabelOptions): Promise<LabelerInfo | null> {
  const url = did.startsWith("did:web:")
    ? new URL(`https://${did.slice("did:web:".length)}/.well-known/did.json`)
    : new URL(`${opts.plcUrl ?? "https://plc.directory"}/${did}`);
  if (!allowedUrl(url, opts)) return null;
  const { status, body } = await getJson(url, opts);
  if (status !== 200 || !body) return null;

  const service = (body.service as { id: string; serviceEndpoint: string }[] | undefined)?.find(
    (s) => s.id === "#atproto_labeler" || s.id === `${did}#atproto_labeler`,
  );
  const method = (
    body.verificationMethod as { id: string; publicKeyMultibase?: string }[] | undefined
  )?.find((m) => m.id === "#atproto_label" || m.id === `${did}#atproto_label`);
  if (!service?.serviceEndpoint || !method?.publicKeyMultibase) return null;
  return {
    did,
    endpoint: service.serviceEndpoint,
    didKey: normaliseKey(method.publicKeyMultibase),
  };
}

// ----------------------------------------------------------------- the check

export interface LabelCheck {
  /** Label values currently in force on the subjects, from the labelers that answered. */
  values: Set<string>;
  /** Labelers that answered with verifiable data. */
  consulted: string[];
  /** Labelers that couldn't be resolved, reached, or understood. */
  unavailable: string[];
}

interface Verdict {
  /** Values in force on the subject according to this labeler; null if it couldn't answer. */
  values: string[] | null;
  expires: number;
}
const verdicts = new Map<string, Verdict>();

/**
 * Which labels the given labelers have in force on the given subjects (an
 * emoji's record URI, its owner's DID). One request per labeler and subject,
 * with a single pattern each, because labelers differ in how they read repeated
 * parameters.
 */
export async function checkLabels(
  subjects: string[],
  labelers: LabelerRef[],
  opts: LabelOptions,
  now: Date = new Date(),
): Promise<LabelCheck> {
  const out: LabelCheck = { values: new Set(), consulted: [], unavailable: [] };
  const results = await Promise.all(
    labelers.map(async (ref) => {
      const did = typeof ref === "string" ? ref : ref.did;
      const info = await resolveLabeler(ref, opts).catch(() => null);
      if (!info) return { did, values: null as string[] | null };
      const perSubject = await Promise.all(subjects.map((s) => labelerVerdict(info, s, opts, now)));
      if (perSubject.some((v) => v === null)) return { did, values: null };
      return { did, values: perSubject.flatMap((v) => v!) };
    }),
  );
  for (const r of results) {
    if (r.values === null) out.unavailable.push(r.did);
    else {
      out.consulted.push(r.did);
      for (const v of r.values) out.values.add(v);
    }
  }
  return out;
}

async function labelerVerdict(
  info: LabelerInfo,
  subject: string,
  opts: LabelOptions,
  now: Date,
): Promise<string[] | null> {
  const ttl = opts.labelCacheTtlMs ?? 60_000;
  const key = `${info.did}|${info.endpoint}|${subject}`;
  const cached = verdicts.get(key);
  if (ttl > 0 && cached && cached.expires > now.getTime()) return cached.values;

  const values = await queryAndVerify(info, subject, opts, now);
  if (ttl > 0) verdicts.set(key, { values, expires: now.getTime() + ttl });
  return values;
}

async function queryAndVerify(
  info: LabelerInfo,
  subject: string,
  opts: LabelOptions,
  now: Date,
): Promise<string[] | null> {
  let url: URL;
  try {
    url = new URL("/xrpc/com.atproto.label.queryLabels", info.endpoint);
  } catch {
    return null;
  }
  if (!allowedUrl(url, opts)) return null;
  url.searchParams.set("uriPatterns", subject);
  url.searchParams.set("sources", info.did);

  let body: { labels?: WireLabel[] } | null;
  try {
    const res = await getJson(url, opts);
    if (res.status !== 200 || !Array.isArray(res.body?.labels)) return null;
    body = res.body;
  } catch {
    return null;
  }

  // Latest verified label per value wins; a negation lifts it
  const latest = new Map<string, WireLabel>();
  let about = 0;
  let verified = 0;
  for (const label of body!.labels!) {
    if (!label || label.src !== info.did || label.uri !== subject) continue;
    if (typeof label.val !== "string" || typeof label.cts !== "string") continue;
    about++;
    if (!(await verifyLabelSignature(label, info.didKey))) continue;
    verified++;
    const prev = latest.get(label.val);
    if (!prev || label.cts > prev.cts) latest.set(label.val, label);
  }
  // Labels for this subject that all fail verification mean the labeler's key
  // doesn't match its DID document: that's a broken labeler, not "no labels"
  if (about > 0 && verified === 0) return null;
  return [...latest.values()]
    .filter((l) => l.neg !== true && !(l.exp && Date.parse(l.exp) <= now.getTime()))
    .map((l) => l.val);
}
