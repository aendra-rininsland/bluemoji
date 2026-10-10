// Underscore prefix keeps this module out of the server/ scanner.

/**
 * Mirrors hatk's own admin check (config.js: `env.ADMINS` — comma-separated
 * DIDs — wins over `admins` in hatk.config.ts; hatk's /admin routes use the
 * same list). hatk doesn't expose the list to XRPC handlers, so it's re-read
 * from the environment here. The config-file fallback is deliberately not
 * supported: production sets ADMINS, and silently diverging from /admin
 * would be worse than failing closed.
 */
export function isAdmin(did: string | undefined | null): boolean {
  if (!did) return false;
  const admins = (process.env.ADMINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return admins.includes(did);
}
