import { defineQuery, NotFoundError } from "$hatk";
import { labelerConfigFromEnv, queryLabels } from "./_labeler.ts";
import { parseUriListParam } from "./_pack-views.ts";

// com.atproto.label.queryLabels for this AppView's moderation labeler (RFC 0007).
// Public. Labels are signed, so a consumer verifies them against the
// `#atproto_label` key in the labeler's DID document rather than trusting us.
// (hatk hands array params through as a single string, so several patterns are
// sent comma-joined; see CLAUDE.md gotcha #8.)
export default defineQuery("com.atproto.label.queryLabels", async (ctx) => {
  const config = labelerConfigFromEnv();
  // Not "no labels": an unconfigured AppView must not look like one that has labelled nothing
  if (!config) throw new NotFoundError("This AppView does not run a labeler");

  const patterns = parseUriListParam(ctx.params.uriPatterns, 25);
  const sources = parseUriListParam(ctx.params.sources, 25);
  return ctx.ok(
    await queryLabels(ctx.db, config.did, {
      patterns,
      sources: sources.length ? sources : undefined,
      limit: ctx.params.limit ? Number(ctx.params.limit) : undefined,
      cursor: ctx.params.cursor || undefined,
    }),
  );
});
