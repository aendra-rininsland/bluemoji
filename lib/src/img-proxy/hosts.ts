/**
 * Whether a hostname (as the URL parser normalised it) could plausibly be a
 * public server: not loopback, private, link-local, CGNAT or reserved space,
 * not a `localhost`/`.local`/`.internal` style name, and not a single-label
 * name. This is a *name* check. It cannot see what a name resolves to, so a
 * host where fetch can reach an internal network should pass a `fetch` that
 * checks connections (see the README); on Cloudflare Workers the platform does.
 */
export function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;

  if (host.includes(":")) return isPublicIPv6(host);

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return isPublicIPv4(host);
  // The URL parser turns 0x7f.1 and 2130706433 into dotted form, so anything
  // all-numeric that survives to here is not a name we should touch
  if (/^[\d.x]+$/i.test(host)) return false;

  if (!host.includes(".")) return false;
  const reserved = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa", ".lan"];
  if (host === "localhost" || reserved.some((s) => host.endsWith(s))) return false;
  return true;
}

function isPublicIPv4(addr: string): boolean {
  const o = addr.split(".").map(Number);
  if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = o;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPublicIPv6(addr: string): boolean {
  if (!/^[0-9a-f:.]+$/.test(addr)) return false;
  if (addr === "::" || addr === "::1") return false;
  // The parser compresses ::ffff:a.b.c.d to ::ffff:xxxx:xxxx; either way it is a mapped IPv4 address
  if (addr.startsWith("::ffff:") || addr.startsWith("0:0:0:0:0:ffff:")) return false;
  const first = parseInt(addr.split(":")[0] || "0", 16);
  if (first >= 0xfe80 && first <= 0xfebf) return false; // link-local
  if (first >= 0xfc00 && first <= 0xfdff) return false; // unique local
  if (first >= 0xff00) return false; // multicast
  return true;
}
