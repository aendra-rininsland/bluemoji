import { defineProcedure, InvalidRequestError } from "$hatk";
import { buildItemRecord } from "./_item-record.ts";

export default defineProcedure("blue.moji.collection.putItem", async (ctx) => {
  if (!ctx.viewer) {
    throw new InvalidRequestError("Authentication required");
  }

  const { repo, item } = ctx.input;

  const isAuthorized = repo === ctx.viewer.did || (ctx.viewer.handle && repo === ctx.viewer.handle);
  if (!isAuthorized) {
    throw new InvalidRequestError("repo must match authenticated user");
  }

  // RFC 0005: canonicalise the alias; non-ASCII aliases get Punycode rkeys.
  let built: ReturnType<typeof buildItemRecord>;
  try {
    built = buildItemRecord(item as any);
  } catch (e) {
    throw new InvalidRequestError(e instanceof Error ? e.message : "Invalid alias");
  }

  let result: { uri?: string };
  try {
    result = await ctx.putRecord("blue.moji.collection.item", built.rkey, built.record);
  } catch (e) {
    // hatk surfaces PDS-proxy failures as a bare 500 (only InvalidRequestError
    // maps to a status). A 400 here is the record failing lexicon validation
    // or being rejected by the PDS — tell the client why instead.
    if ((e as { status?: number })?.status === 400 && e instanceof Error) {
      throw new InvalidRequestError(e.message);
    }
    throw e;
  }

  if (!result.uri) {
    throw new InvalidRequestError("PDS did not return a URI for the written record");
  }

  return ctx.ok({ uri: result.uri });
});
