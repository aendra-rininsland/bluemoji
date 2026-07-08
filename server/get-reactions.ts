import { defineQuery, InvalidRequestError } from "$hatk";
import { handlesForDids, normalizeFormats } from "./_pack-views.ts";

interface ReactionRow {
  uri: string;
  cid: string;
  did: string;
  emoji: string; // JSON text of blue.moji.feed.reaction#emojiRef, self-attested
  created_at: string;
}

interface ItemRecord {
  name: string;
  alt?: string;
  formats: unknown;
  adultOnly?: boolean;
}

function parseEmoji(text: string): { uri?: string } & Record<string, unknown> {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * blue.moji.feed.reaction#emojiRef is self-attested by the reactor (see RFC
 * 0001 amendment) — a client could claim any did/name/formats. Rebuild it
 * from the indexed blue.moji.collection.item instead of trusting the stored
 * value; that item was only indexed after the relay verified its owner's
 * repo commit, so it's the actual trust anchor. Reactions whose claimed
 * subject can't be verified (deleted, or never existed) are dropped.
 *
 * adultOnly is populated here from the source item, never from the reactor's
 * own claim — the reaction record carries no self-label of its own, so a
 * consumer that skips this hydration step would render a sensitive emoji
 * with no warning at all. See RFC 0001's self-label propagation note.
 */
function verifiedEmojiRef(
  claimed: { uri?: string },
  verified: Map<string, { uri: string; cid: string; value: ItemRecord }>,
) {
  const uri = claimed.uri;
  if (!uri) return null;
  const record = verified.get(uri);
  if (!record) return null;
  return {
    $type: "blue.moji.feed.reaction#emojiRef",
    uri,
    cid: record.cid,
    name: record.value.name,
    alt: record.value.alt,
    adultOnly: Boolean(record.value.adultOnly),
    formats: normalizeFormats(record.value.formats),
  };
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

  // Verify every claimed emoji URI (from both groups and the reaction page)
  // against the indexed source item in one batch, before trusting any of it.
  const claimedGroups = groupRows.map((row) => parseEmoji(row.emoji));
  const claimedReactions = visible.map((row) => parseEmoji(row.emoji));
  const claimedUris = new Set(
    [...claimedGroups, ...claimedReactions].flatMap((e) => (e.uri ? [e.uri] : [])),
  );
  const verifiedItems = await ctx.getRecords<ItemRecord>("blue.moji.collection.item", [
    ...claimedUris,
  ]);

  const groups = groupRows.flatMap((row, i) => {
    const verified = verifiedEmojiRef(claimedGroups[i], verifiedItems);
    if (!verified) return [];
    return [
      {
        $type: "blue.moji.feed.defs#reactionGroup",
        emoji: verified,
        count: row.n,
        viewer: viewerReactions.get(verified.uri),
      },
    ];
  });

  const reactions = visible.flatMap((row, i) => {
    const verified = verifiedEmojiRef(claimedReactions[i], verifiedItems);
    if (!verified) return [];
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
        emoji: verified,
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
