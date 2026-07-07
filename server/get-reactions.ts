import { defineQuery, InvalidRequestError } from "$hatk";
import { handlesForDids } from "./_pack-views.ts";

interface ReactionRow {
  uri: string;
  cid: string;
  did: string;
  emoji: string; // JSON text of blue.moji.feed.reaction#emojiRef
  created_at: string;
}

function parseEmoji(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default defineQuery("blue.moji.feed.getReactions", async (ctx) => {
  const { uri } = ctx.params;
  if (!uri) throw new InvalidRequestError("uri is required");
  const limit = ctx.limit ?? 50;

  // Aggregate groups: one row per distinct emoji item, counting distinct actors
  // (duplicate reactions by the same actor are ignored per the lexicon).
  const groupRows = (await ctx.db.query(
    `SELECT emoji, COUNT(DISTINCT did) AS n, MIN(created_at) AS first_at
     FROM "blue.moji.feed.reaction"
     WHERE subject = $1
     GROUP BY json_extract(emoji, '$.uri')
     ORDER BY n DESC, first_at ASC`,
    [uri],
  )) as { emoji: string; n: number }[];

  // The viewer's own reactions, for un-react affordances.
  const viewerReactions = new Map<string, string>();
  if (ctx.viewer) {
    const rows = (await ctx.db.query(
      `SELECT uri, json_extract(emoji, '$.uri') AS emoji_uri
       FROM "blue.moji.feed.reaction"
       WHERE subject = $1 AND did = $2`,
      [uri, ctx.viewer.did],
    )) as { uri: string; emoji_uri: string }[];
    for (const row of rows) viewerReactions.set(row.emoji_uri, row.uri);
  }

  const groups = groupRows.flatMap((row) => {
    const emoji = parseEmoji(row.emoji);
    if (!emoji) return [];
    return [
      {
        $type: "blue.moji.feed.defs#reactionGroup",
        emoji,
        count: row.n,
        viewer: viewerReactions.get(emoji.uri as string),
      },
    ];
  });

  // Paginated individual reactions, newest first.
  const params: unknown[] = [uri];
  let cursorClause = "";
  const unpacked = ctx.cursor ? ctx.unpackCursor(ctx.cursor) : null;
  if (unpacked) {
    cursorClause = `AND (created_at < $2 OR (created_at = $2 AND cid < $3))`;
    params.push(unpacked.primary, unpacked.cid);
  }

  const rows = (await ctx.db.query(
    `SELECT uri, cid, did, emoji, created_at FROM "blue.moji.feed.reaction"
     WHERE subject = $1 ${cursorClause}
     ORDER BY created_at DESC, cid DESC
     LIMIT ${limit + 1}`,
    params,
  )) as ReactionRow[];

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const takendown = await ctx.filterTakendownDids(page.map((row) => row.did));
  const visible = page.filter((row) => !takendown.has(row.did));

  const dids = visible.map((row) => row.did);
  const [handles, profiles] = await Promise.all([
    handlesForDids(ctx, dids),
    ctx.lookup<{ displayName?: string; avatar?: unknown }>("app.bsky.actor.profile", "did", dids),
  ]);

  const reactions = visible.flatMap((row) => {
    const emoji = parseEmoji(row.emoji);
    if (!emoji) return [];
    const profile = profiles.get(row.did)?.value;
    return [
      {
        $type: "blue.moji.feed.defs#reactionView",
        uri: row.uri,
        actor: {
          did: row.did,
          handle: handles.get(row.did) ?? "handle.invalid",
          displayName: profile?.displayName,
          avatar: ctx.blobUrl(row.did, profile?.avatar),
        },
        emoji,
        createdAt: row.created_at,
      },
    ];
  });

  const last = page[page.length - 1];
  return ctx.ok({
    uri,
    groups,
    reactions,
    cursor: hasMore && last ? ctx.packCursor(last.created_at, last.cid) : undefined,
  });
});
