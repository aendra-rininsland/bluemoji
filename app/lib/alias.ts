// Bluemoji alias canonicalisation and rkey encoding per RFC 0005.
// ATProto record keys are ASCII-only, so non-ASCII aliases are encoded with
// Punycode (RFC 3492) under the `xn--` convention. Deterministic and
// reversible, so alias→rkey lookups stay O(1) against a raw PDS.

const ASCII_ALIAS_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;
const MAX_CODEPOINTS = 64;

// RFC 3492 parameters
const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

function digitToBasic(digit: number): number {
  // 0..25 → a..z, 26..35 → 0..9
  return digit + 22 + 75 * (digit < 26 ? 1 : 0);
}

function basicToDigit(cp: number): number {
  if (cp - 48 < 10) return cp - 22;
  if (cp - 97 < 26) return cp - 97;
  if (cp - 65 < 26) return cp - 65;
  return BASE;
}

export function punycodeEncode(input: string): string {
  const cps = [...input].map((c) => c.codePointAt(0)!);
  let output = cps
    .filter((cp) => cp < 0x80)
    .map((cp) => String.fromCharCode(cp))
    .join("");
  const basicLength = output.length;
  let handled = basicLength;
  if (basicLength) output += "-";

  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;

  while (handled < cps.length) {
    let m = Infinity;
    for (const cp of cps) if (cp >= n && cp < m) m = cp;
    delta += (m - n) * (handled + 1);
    n = m;
    for (const cp of cps) {
      if (cp < n) delta++;
      if (cp === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          output += String.fromCharCode(digitToBasic(t + ((q - t) % (BASE - t))));
          q = Math.floor((q - t) / (BASE - t));
        }
        output += String.fromCharCode(digitToBasic(q));
        bias = adapt(delta, handled + 1, handled === basicLength);
        delta = 0;
        handled++;
      }
    }
    delta++;
    n++;
  }
  return output;
}

export function punycodeDecode(input: string): string {
  const output: number[] = [];
  const lastDelim = input.lastIndexOf("-");
  const basic = lastDelim > 0 ? input.slice(0, lastDelim) : "";
  for (const ch of basic) {
    const cp = ch.charCodeAt(0);
    if (cp >= 0x80) throw new Error("Invalid Punycode: non-basic code point");
    output.push(cp);
  }

  let index = lastDelim > 0 ? lastDelim + 1 : 0;
  let i = 0;
  let n = INITIAL_N;
  let bias = INITIAL_BIAS;

  while (index < input.length) {
    const oldi = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (index >= input.length) throw new Error("Invalid Punycode: truncated");
      const digit = basicToDigit(input.charCodeAt(index++));
      if (digit >= BASE) throw new Error("Invalid Punycode: bad digit");
      i += digit * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - oldi, output.length + 1, oldi === 0);
    n += Math.floor(i / (output.length + 1));
    i %= output.length + 1;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}

const BIDI_CONTROLS = new Set([
  0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
]);
const ZWJ = 0x200d;

/**
 * Canonicalise a raw alias (with or without wrapping colons) per RFC 0005:
 * strip colons, trim, NFC, locale-independent lowercase, NFC again — then
 * validate. Throws with a human-readable message on invalid input.
 */
export function normalizeAlias(raw: string): string {
  let alias = raw.trim().replace(/^:+|:+$/g, "");
  alias = alias.normalize("NFC").toLowerCase().normalize("NFC");
  if (!alias) throw new Error("Alias must not be empty");

  const cps = [...alias];
  if (cps.length > MAX_CODEPOINTS) {
    throw new Error(`Alias too long (max ${MAX_CODEPOINTS} code points)`);
  }
  for (const ch of cps) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x3a) throw new Error("Alias must not contain ':'");
    if (/\s/u.test(ch)) throw new Error("Alias must not contain whitespace");
    if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) {
      throw new Error("Alias must not contain control characters");
    }
    if (BIDI_CONTROLS.has(cp)) {
      throw new Error("Alias must not contain bidirectional control characters");
    }
    if (cp !== ZWJ && /\p{Cf}/u.test(ch)) {
      throw new Error("Alias must not contain format characters (except ZWJ)");
    }
  }
  if (alias.length >= 4 && alias[2] === "-" && alias[3] === "-") {
    throw new Error("Alias must not have '--' in the third and fourth position");
  }
  return alias;
}

/** Derive the record key for an alias (or colon-wrapped name). RFC 0005. */
export function aliasToRkey(aliasOrName: string): string {
  const alias = normalizeAlias(aliasOrName);
  if (ASCII_ALIAS_RE.test(alias)) return alias;
  if (!/[^\x00-\x7f]/.test(alias)) {
    throw new Error(
      "ASCII aliases may use only a-z, 0-9, '.', '_', '-', starting and ending alphanumeric",
    );
  }
  return `xn--${punycodeEncode(alias)}`;
}

/** Recover the display alias from a record key. RFC 0005. */
export function rkeyToAlias(rkey: string): string {
  return rkey.startsWith("xn--") ? punycodeDecode(rkey.slice(4)) : rkey;
}
