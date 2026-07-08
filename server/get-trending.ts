import { defineQuery, InvalidRequestError } from "$hatk";
import { parseEmojiClaim, verifiedEmojiRef, type ReactionItemRecord } from "./_pack-views.ts";

const PERIOD_DAYS: Record<string, number> = { day: 1, week: 7, month: 30 };

// Pull more candidate groups than the final limit so that spoofed/deleted
// claims (dropped by verification) don't leave a short result — capped to
// keep the ctx.getRecords batch reasonable.
const CANDIDATE_MULTIPLIER = 4;
const MAX_CANDIDATES = 400;

export default defineQuery("blue.moji.feed.getTrending", async (ctx) => {
  const period = (ctx.params.period as string | undefined) ?? "week";
  const days = PERIOD_DAYS[period];
  if (!days) throw new InvalidRequestError("period must be 'day', 'week', or 'month'");

  const limit = Math.min(Number(ctx.params.limit) || 25, 100);
  const candidateLimit = Math.min(limit * CANDIDATE_MULTIPLIER, MAX_CANDIDATES);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const groupRows = (await ctx.db.query(
    `SELECT emoji, COUNT(DISTINCT did) AS n
     FROM "blue.moji.feed.reaction"
     WHERE created_at >= $1
     GROUP BY json_extract(emoji, '$.uri')
     ORDER BY n DESC
     LIMIT ${candidateLimit}`,
    [since],
  )) as { emoji: string; n: number }[];

  const claims = groupRows.map((row) => parseEmojiClaim(row.emoji));
  const claimedUris = new Set(claims.flatMap((e) => (e.uri ? [e.uri] : [])));
  const verifiedItems = await ctx.getRecords<ReactionItemRecord>("blue.moji.collection.item", [
    ...claimedUris,
  ]);

  // Drop items whose source account has since been taken down.
  const ownerDids = [...claimedUris].flatMap((uri) => {
    const match = uri.match(/^at:\/\/(did:[^/]+)\//);
    return match ? [{ uri, did: match[1] }] : [];
  });
  const takendown = await ctx.filterTakendownDids(ownerDids.map((o) => o.did));
  const takendownUris = new Set(ownerDids.filter((o) => takendown.has(o.did)).map((o) => o.uri));

  const items = groupRows
    .flatMap((row, i) => {
      const claim = claims[i];
      if (claim.uri && takendownUris.has(claim.uri)) return [];
      const verified = verifiedEmojiRef(claim, verifiedItems);
      if (!verified) return [];
      return [
        {
          $type: "blue.moji.feed.defs#reactionGroup",
          emoji: verified,
          count: row.n,
        },
      ];
    })
    .slice(0, limit);

  return ctx.ok({ period, items });
});
