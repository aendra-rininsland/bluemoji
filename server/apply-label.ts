import { defineProcedure, InvalidRequestError } from "$hatk";
import { isAdmin } from "./_admin.ts";
import {
  appendLabel,
  ensureLabelTable,
  keypairFromHex,
  labelerConfigFromEnv,
  LabelInputError,
  validateApply,
  wireLabel,
} from "./_labeler.ts";

let keypair: ReturnType<typeof keypairFromHex> | undefined;

// Apply or lift a moderation label on an emoji and publish it, signed, from the
// labeler (RFC 0007). This AppView honours the result itself: see _label-effects.ts.
export default defineProcedure("blue.moji.moderation.applyLabel", async (ctx) => {
  if (!ctx.viewer) throw new InvalidRequestError("Authentication required");
  if (!isAdmin(ctx.viewer.did)) throw new InvalidRequestError("Admin access required");

  const config = labelerConfigFromEnv();
  if (!config) throw new InvalidRequestError("This AppView's labeler isn't configured");

  let req;
  try {
    req = validateApply(ctx.input as Parameters<typeof validateApply>[0]);
  } catch (e) {
    if (e instanceof LabelInputError) throw new InvalidRequestError(e.message);
    throw e;
  }

  // Applying needs a real emoji; lifting must still work after the record is gone
  if (!req.neg) {
    const rows = (await ctx.db.query(`SELECT uri FROM "blue.moji.collection.item" WHERE uri = $1`, [
      req.uri,
    ])) as unknown[];
    if (!rows.length) throw new InvalidRequestError("That emoji isn't indexed by this AppView");
  }

  await ensureLabelTable(ctx.db);
  keypair ??= keypairFromHex(config.signingKeyHex);
  const label = await appendLabel(ctx.db, config, await keypair, {
    uri: req.uri,
    val: req.val,
    neg: req.neg,
    exp: req.exp,
    origin: "admin",
    appliedBy: ctx.viewer.did,
    reason: req.reason,
  });
  return ctx.ok({
    label: wireLabel(
      {
        id: 0,
        uri: label.uri,
        cid: label.cid ?? null,
        val: label.val,
        neg: label.neg ? 1 : 0,
        cts: label.cts,
        exp: label.exp ?? null,
        sig: Buffer.from(label.sig!).toString("base64"),
        origin: "admin",
      },
      config.did,
    ),
  });
});
