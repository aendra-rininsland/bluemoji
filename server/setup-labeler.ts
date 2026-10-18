import { defineSetup } from "$hatk";
import {
  ensureLabelTable,
  keypairFromHex,
  labelerConfigFromEnv,
  reconcileTakedowns,
} from "./_labeler.ts";

const POLL_MS = Number(process.env.LABELER_POLL_MS ?? 15_000);

// Publishes account takedowns as signed `bluemoji-takedown` labels (RFC 0007).
// Disabled, with a log line, unless LABELER_DID and LABELER_SIGNING_KEY are set.
export default defineSetup(async (ctx) => {
  const config = labelerConfigFromEnv();
  if (!config) {
    console.log("[labeler] disabled: LABELER_DID / LABELER_SIGNING_KEY not set (or malformed)");
    return;
  }
  const keypair = await keypairFromHex(config.signingKeyHex);
  await ensureLabelTable(ctx.db);
  console.log("[labeler] enabled", { did: config.did, key: keypair.did() });

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { labelled, lifted } = await reconcileTakedowns(ctx.db, config, keypair);
      if (labelled.length || lifted.length) {
        console.log("[labeler] takedown labels updated", {
          labelled: labelled.length,
          lifted: lifted.length,
        });
      }
    } catch (e) {
      console.error("[labeler] takedown sync failed", e);
    } finally {
      running = false;
    }
  };

  await tick();
  setInterval(tick, POLL_MS).unref();
});
