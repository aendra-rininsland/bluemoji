import { defineSetup } from "$hatk";
import { purgeAccount, purger } from "./_purge-runtime.ts";
import { ensureStateTable, pollTakedowns } from "./_takedown-watch.ts";

const POLL_MS = Number(process.env.CLOUDFLARE_PURGE_POLL_MS ?? 15_000);

// Purge Cloudflare's cached getItem responses when an account is taken down or
// reinstated. See server/_cache-purge.ts for why this is URL-based and best
// effort. Disabled (with a log line) unless CLOUDFLARE_ZONE_ID and
// CLOUDFLARE_API_TOKEN are set.
export default defineSetup(async (ctx) => {
  if (!purger.enabled) {
    console.log("[cache-purge] disabled: CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN not set");
    return;
  }
  await ensureStateTable(ctx.db);

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await pollTakedowns(ctx.db, async (dids) => {
        console.log("[cache-purge] takedown status changed", { dids: dids.length });
        for (const did of dids) await purgeAccount(ctx.db.query, did);
      });
    } catch (e) {
      console.error("[cache-purge] takedown poll failed", e);
    } finally {
      running = false;
    }
  };

  await tick(); // records the baseline on first run, catches downtime after that
  setInterval(tick, POLL_MS).unref();
});
