// License and source ("where did this come from") for emoji and packs.
// Both are optional, self-asserted by the record's owner, and untrusted when
// read: writers validate with licenseError()/sourceError(), and anything that
// renders them as a link must go through safeHref()/licenseUrl().

export const SOURCE_MAX_BYTES = 2048;
export const LICENSE_MAX_BYTES = 128;

const bytes = (s: string) => new TextEncoder().encode(s).length;

/** C0/C1 control characters (and DEL): never legitimate in a URL, and a classic smuggling vector. */
function hasControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- source

/** The URL if it is a plain http(s) link (no credentials), normalised; otherwise null. */
export function safeHref(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw || bytes(raw) > SOURCE_MAX_BYTES || /\s/.test(raw) || hasControlChars(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || !url.hostname) return null;
  return url.href;
}

/** What's wrong with a source URL, or null if it's fine (empty is fine). */
export function sourceError(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (bytes(raw) > SOURCE_MAX_BYTES)
    return `Source URL is too long (max ${SOURCE_MAX_BYTES} bytes)`;
  if (/\s/.test(raw)) return "Source URL can't contain spaces";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Source must be a full URL, like https://example.com/my-art";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    return "Source must start with https:// or http://";
  if (url.username || url.password) return "Source URL can't contain a username or password";
  return null;
}

/** "example.com" for display next to a link. */
export function sourceHost(href: string): string {
  try {
    return new URL(href).host.replace(/^www\./, "");
  } catch {
    return href;
  }
}

// --------------------------------------------------------------- license

export interface CommonLicense {
  id: string;
  label: string;
}

/**
 * The explicit "do not copy" license. SPDX's own `NONE` means "no license
 * information" and reads ambiguously (is it public domain?), so a creator who
 * wants to keep their work uncopyable uses this well-formed LicenseRef instead.
 */
export const ALL_RIGHTS_RESERVED = "LicenseRef-All-Rights-Reserved";

/** Offered in pickers; anything else can be typed as an SPDX expression. */
export const COMMON_LICENSES: readonly CommonLicense[] = [
  { id: "CC0-1.0", label: "CC0 1.0 — public domain dedication" },
  { id: "CC-BY-4.0", label: "CC BY 4.0 — attribution" },
  { id: "CC-BY-SA-4.0", label: "CC BY-SA 4.0 — attribution, share-alike" },
  { id: "CC-BY-NC-4.0", label: "CC BY-NC 4.0 — attribution, non-commercial" },
  { id: "CC-BY-NC-SA-4.0", label: "CC BY-NC-SA 4.0 — non-commercial, share-alike" },
  { id: "CC-BY-ND-4.0", label: "CC BY-ND 4.0 — attribution, no derivatives" },
  { id: "CC-BY-NC-ND-4.0", label: "CC BY-NC-ND 4.0 — non-commercial, no derivatives" },
  { id: "MIT", label: "MIT" },
  { id: "Apache-2.0", label: "Apache 2.0" },
  { id: "Unlicense", label: "The Unlicense — public domain" },
  { id: ALL_RIGHTS_RESERVED, label: "All rights reserved — no copying" },
];

const COMMON_BY_LOWER = new Map(COMMON_LICENSES.map((l) => [l.id.toLowerCase(), l]));

const IDSTRING = /^[A-Za-z0-9.-]+$/;
const LICENSE_REF = /^(?:DocumentRef-[A-Za-z0-9.-]+:)?LicenseRef-[A-Za-z0-9.-]+$/;
const OPERATORS = new Set(["AND", "OR", "WITH"]);

type Parse = { ok: true } | { ok: false; error: string };

/**
 * Syntax-check an SPDX license expression (SPDX spec Annex D): license ids
 * with an optional `+`, `LicenseRef-…`, `WITH` exceptions, `AND`/`OR`, and
 * parentheses. This checks form, not membership of the SPDX license list —
 * the list grows, and an unknown-but-well-formed id is still useful provenance.
 */
export function parseSpdx(expression: string): Parse {
  const tokens = expression
    .replace(/([()])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
  let pos = 0;
  const fail = (error: string): Parse => ({ ok: false, error });
  const peek = () => tokens[pos];

  const simple = (): string | null => {
    const t = tokens[pos++];
    if (t === undefined) return "The expression ends too early";
    if (t === "(" || t === ")" || OPERATORS.has(t)) return `Unexpected "${t}"`;
    if (LICENSE_REF.test(t)) return null;
    const id = t.endsWith("+") ? t.slice(0, -1) : t;
    if (!IDSTRING.test(id)) return `"${t}" isn't a valid license identifier`;
    if (id === "NONE" || id === "NOASSERTION")
      return "Leave the license empty instead of NONE/NOASSERTION";
    return null;
  };
  const withExpr = (): string | null => {
    const err = simple();
    if (err) return err;
    if (peek() === "WITH") {
      pos++;
      const t = tokens[pos++];
      if (t === undefined || t === "(" || t === ")" || OPERATORS.has(t) || !IDSTRING.test(t)) {
        return "WITH must be followed by an exception identifier";
      }
    }
    return null;
  };
  const primary = (): string | null => {
    if (peek() === "(") {
      pos++;
      const err = orExpr();
      if (err) return err;
      if (tokens[pos++] !== ")") return 'Missing closing ")"';
      return null;
    }
    return withExpr();
  };
  const andExpr = (): string | null => {
    let err = primary();
    while (!err && peek() === "AND") {
      pos++;
      err = primary();
    }
    return err;
  };
  const orExpr = (): string | null => {
    let err = andExpr();
    while (!err && peek() === "OR") {
      pos++;
      err = andExpr();
    }
    return err;
  };

  if (!tokens.length) return fail("The expression is empty");
  const err = orExpr();
  if (err) return fail(err);
  if (pos < tokens.length) return fail(`Unexpected "${tokens[pos]}"`);
  return { ok: true };
}

/**
 * Tidy what a person typed into an SPDX expression: single spaces, uppercase
 * operators, and canonical casing for the common ids ("cc-by-4.0" → "CC-BY-4.0").
 */
export function normalizeLicense(input: string): string {
  return input
    .replace(/([()])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const upper = t.toUpperCase();
      if (OPERATORS.has(upper)) return upper;
      const plus = t.endsWith("+") ? "+" : "";
      const known = COMMON_BY_LOWER.get((plus ? t.slice(0, -1) : t).toLowerCase());
      return known ? known.id + plus : t;
    })
    .join(" ")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")");
}

/** What's wrong with a license expression, or null if it's fine (empty is fine). */
export function licenseError(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (bytes(v) > LICENSE_MAX_BYTES) return `License is too long (max ${LICENSE_MAX_BYTES} bytes)`;
  const parsed = parseSpdx(normalizeLicense(v));
  return "error" in parsed ? parsed.error : null;
}

/** Human label: "CC BY 4.0 — attribution" for known ids, otherwise the expression itself. */
export function licenseLabel(expression: string): string {
  return COMMON_BY_LOWER.get(expression.toLowerCase())?.label ?? expression;
}

/**
 * Whether the reference UI offers "copy to my collection" for an item with
 * this license. Copying duplicates the work into another repo, so it needs a
 * grant: no license at all means no grant, and all-rights-reserved withholds
 * it. An `OR` expression is copyable (some alternative may grant it).
 * This is advisory UI behaviour — ATProto can't stop a client writing a record.
 */
export function isCopyable(license: string | null | undefined): boolean {
  const l = license?.trim();
  if (!l) return false;
  const tokens = l
    .replace(/([()])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.includes("OR")) return true;
  return !tokens.some((t) => t.toLowerCase() === ALL_RIGHTS_RESERVED.toLowerCase());
}

/**
 * Link to the SPDX page for a single, well-formed license id (not for
 * expressions, LicenseRefs, or anything unvalidated).
 */
export function licenseUrl(expression: string): string | null {
  const id = expression.trim();
  if (!/^[A-Za-z0-9.-]+$/.test(id) || id.startsWith("LicenseRef-")) return null;
  return parseSpdx(id).ok ? `https://spdx.org/licenses/${id}.html` : null;
}

/** Trimmed, normalised values ready to store, or an error message. Empty strings become undefined. */
export function cleanProvenance(
  license: string | null | undefined,
  source: string | null | undefined,
): { license?: string; source?: string } | { error: string } {
  const l = (license ?? "").trim();
  const s = (source ?? "").trim();
  const err = licenseError(l) ?? sourceError(s);
  if (err) return { error: err };
  const href = s ? new URL(s).href : "";
  return { ...(l ? { license: normalizeLicense(l) } : {}), ...(href ? { source: href } : {}) };
}

/**
 * Provenance as it should appear in an API view. Records are written by their
 * owners and only length-checked by the PDS, so anything stored may be junk;
 * each field is kept only if it passes validation (a bad one is dropped
 * without affecting the other), the license is normalised, and the source is
 * reduced to a safe http(s) URL.
 */
export function viewProvenance(
  license: string | null | undefined,
  source: string | null | undefined,
): { license?: string; source?: string } {
  const l = (license ?? "").trim();
  const href = safeHref(source);
  return {
    ...(l && licenseError(l) === null ? { license: normalizeLicense(l) } : {}),
    ...(href ? { source: href } : {}),
  };
}

/** The first problem with a license/source pair, or null — for disabling a Save/Import button. */
export function provenanceError(license: string, source: string): string | null {
  return licenseError(license) ?? sourceError(source);
}
