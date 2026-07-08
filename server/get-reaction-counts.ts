import { defineQuery, InvalidRequestError } from "$hatk";
import {
  MAX_REACTION_GROUPS,
  parseEmojiClaim,
  parseUriListParam,
  verifiedEmojiRef,
  type ReactionItemRecord,
} from "./_pack-views.ts";

interface ReactionRow {
  subject: string;
  emoji: string;
  n: number;
  first_at: string;
}

export default defineQuery("blue.moji.feed.getReactionCounts", async (ctx) => {
  const uris = parseUriListParam(ctx.params.uris, 50);
  if (uris.length === 0) throw new InvalidRequestError("uris is required");

  const placeholders = uris.map((_, i) => `$${i + 1}`).join(",");
  // One query for every subject: group by (subject, emoji uri), counting
  // distinct actors per group, same aggregation getReactions uses for a
  // single post. Row order matters for the per-subject cap below, so sort
  // by subject then count/recency exactly like getReactions does.
  const rows = (await ctx.db.query(
    `SELECT subject, emoji, COUNT(DISTINCT did) AS n, MIN(created_at) AS first_at
     FROM "blue.moji.feed.reaction"
     WHERE subject IN (${placeholders})
     GROUP BY subject, json_extract(emoji, '$.uri')
     ORDER BY subject, n DESC, first_at ASC`,
    uris,
  )) as ReactionRow[];

  // Cap distinct groups per subject (AppView anti-spam policy, same
  // MAX_REACTION_GROUPS as getReactions) before verification, so we don't
  // waste a getRecords lookup on emoji claims that would be dropped anyway.
  const bySubject = new Map<string, ReactionRow[]>();
  for (const row of rows) {
    const list = bySubject.get(row.subject) ?? [];
    if (list.length < MAX_REACTION_GROUPS) list.push(row);
    bySubject.set(row.subject, list);
  }

  const capped = [...bySubject.values()].flat();
  const claims = capped.map((row) => parseEmojiClaim(row.emoji));
  const claimedUris = new Set(claims.flatMap((e) => (e.uri ? [e.uri] : [])));
  const verifiedItems = await ctx.getRecords<ReactionItemRecord>("blue.moji.collection.item", [
    ...claimedUris,
  ]);

  const counts = [...bySubject.entries()].map(([subject, subjectRows]) => ({
    $type: "blue.moji.feed.getReactionCounts#subjectReactionCounts",
    uri: subject,
    groups: subjectRows.flatMap((row) => {
      const verified = verifiedEmojiRef(parseEmojiClaim(row.emoji), verifiedItems);
      if (!verified) return [];
      return [
        {
          $type: "blue.moji.feed.defs#reactionGroup",
          emoji: verified,
          count: row.n,
        },
      ];
    }),
  }));

  return ctx.ok({ counts });
});
