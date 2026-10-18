import { defineOG, type OpengraphContext, type SatoriNode } from "@hatk/hatk/opengraph";
import { takendownItemUris } from "../_label-effects.ts";
import { handlesForDids } from "../_pack-views.ts";
import { resolvePds as resolveAppPds } from "../../app/lib/pds.ts";
import { cardText, clip, fetchCardImage } from "./_card-text.ts";

interface PackRow {
  uri: string;
  did: string;
  name: string;
  description: string | null;
  icon: string | null;
  adult_only: number | null;
  created_at: string;
}

interface ItemRow {
  uri: string;
  did: string;
  adult_only: number | null;
  formats: string | null;
}

/** The PDS for a DID, or null. Shared with the app: bounded cache, public https endpoints only. */
const resolvePds = (did: string) => resolveAppPds(did, fetch).catch(() => null);

/** Mirrors the pack page's own handle resolution: DIDs (the common case —
 * every in-app share link uses one) skip the network round-trip entirely. */
async function resolveDid(handle: string): Promise<string | null> {
  if (handle.startsWith("did:")) return handle;
  try {
    const res = await fetch(
      `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
    );
    if (!res.ok) return null;
    return ((await res.json()) as { did: string }).did;
  } catch {
    return null;
  }
}

function parseJson(text: string | null): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * ctx.blobUrl falls back to https://cdn.bsky.app/img/{preset}/... when no
 * custom CDN is configured (see hatk.config.ts), and the OG context wrapper
 * suffixes whatever preset we pass with "_og" (e.g. "avatar_og") — a preset
 * Bluesky's CDN doesn't recognise, since we haven't configured a matching
 * custom imgproxy. Build the getBlob URL against the icon owner's own PDS
 * directly instead, exactly like /img/{did}/{cid} and app/lib/pds.ts do.
 */
function blobRefCid(ref: unknown): string | undefined {
  return (ref as { ref?: { $link?: string } } | undefined)?.ref?.$link;
}

/** Emoji shown in the preview strip */
const MAX_PREVIEW_EMOJI = 12;
/** Extra candidates fetched so a few failed or filtered images don't leave gaps */
const CANDIDATE_SLACK = 6;
const CARD_PADDING = 64;
const CONTENT_WIDTH = 1200 - CARD_PADDING * 2;

const blobUrlFor = (pds: string, did: string, cid: string) =>
  `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;

/**
 * Data URLs for up to `limit` of the pack's emoji, in pack order. This is a
 * public preview, so nothing sensitive is shown: adult-only emoji and emoji
 * from taken-down accounts are skipped. Only each emoji's static 128px PNG is
 * used (Satori can't draw WebP). Never throws: a failure just means fewer
 * (or no) emoji in the preview.
 */
async function previewEmoji(ctx: OpengraphContext, packUri: string, limit: number) {
  try {
    const links = (await ctx.db.query(
      `SELECT subject FROM "blue.moji.packs.packitem" WHERE pack = $1 ORDER BY created_at ASC, cid ASC LIMIT ${limit * 4}`,
      [packUri],
    )) as { subject: string }[];
    const subjects = [...new Set(links.map((l) => l.subject))];
    if (!subjects.length) return [];

    const placeholders = subjects.map((_, i) => `$${i + 1}`).join(",");
    const rows = (await ctx.db.query(
      `SELECT uri, did, adult_only, formats FROM "blue.moji.collection.item" WHERE uri IN (${placeholders})`,
      subjects,
    )) as ItemRow[];
    const byUri = new Map(rows.map((r) => [r.uri, r]));

    const takendown = await ctx.filterTakendownDids([...new Set(rows.map((r) => r.did))]);
    const hiddenItems = await takendownItemUris(
      ctx.db.query,
      rows.map((r) => r.uri),
    );
    const candidates: { did: string; cid: string }[] = [];
    for (const uri of subjects) {
      const row = byUri.get(uri);
      if (!row || row.adult_only || takendown.has(row.did) || hiddenItems.has(uri)) continue;
      const formats = parseJson(row.formats) as { png_128?: unknown } | undefined;
      const cid = blobRefCid(formats?.png_128);
      if (cid) candidates.push({ did: row.did, cid });
      if (candidates.length >= limit + CANDIDATE_SLACK) break;
    }

    const pdsFor = new Map<string, Promise<string | null>>();
    const images = await Promise.all(
      candidates.map(async ({ did, cid }) => {
        if (!pdsFor.has(did)) pdsFor.set(did, resolvePds(did));
        const pds = await pdsFor.get(did)!;
        return pds ? fetchCardImage(blobUrlFor(pds, did, cid)) : null;
      }),
    );
    return images.filter((i): i is string => !!i).slice(0, limit);
  } catch {
    return [];
  }
}

export default defineOG("/og/packs/:handle/:rkey", async (ctx) => {
  const { handle, rkey } = ctx.params as { handle: string; rkey: string };
  const bg: SatoriNode = { type: "div", props: { style: bgStyle, children: "moji.blue" } };

  const did = await resolveDid(handle);
  if (!did) return { element: bg };

  const uri = `at://${did}/blue.moji.packs.pack/${rkey}`;
  const rows = (await ctx.db.query(`SELECT * FROM "blue.moji.packs.pack" WHERE uri = $1`, [
    uri,
  ])) as PackRow[];
  const pack = rows[0];
  if (!pack || (await ctx.isTakendown(pack.did))) return { element: bg };

  const counts = await ctx.count("blue.moji.packs.packitem", "pack", [uri]);
  const itemCount = counts.get(uri) ?? 0;

  const handles = await handlesForDids(ctx, [did]);
  const creatorHandle = cardText(handles.get(did) ?? "handle.invalid") || "handle.invalid";

  // Pack icon (PNG/JPEG only, size-capped)
  let iconDataUrl: string | null = null;
  const iconCid = blobRefCid(parseJson(pack.icon));
  if (iconCid) {
    const pds = await resolvePds(pack.did);
    if (pds) iconDataUrl = await fetchCardImage(blobUrlFor(pds, pack.did, iconCid));
  }

  // The pack's own emoji make the best preview — but not for adult-only packs
  const emoji = pack.adult_only ? [] : await previewEmoji(ctx, uri, MAX_PREVIEW_EMOJI);

  // Only text the card font can draw (anything else would render as "NO GLYPH")
  const title = cardText(pack.name) || "Bluemoji pack";
  const description = clip(cardText(pack.description), 140);

  const emojiSize = Math.min(
    96,
    Math.floor((CONTENT_WIDTH - (emoji.length - 1) * 16) / Math.max(emoji.length, 1)),
  );

  const header: SatoriNode = {
    type: "div",
    props: {
      style: { display: "flex", alignItems: "center", width: "100%" },
      children: [
        ...(iconDataUrl
          ? [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    width: 160,
                    height: 160,
                    borderRadius: 24,
                    background: "#26314a",
                    marginRight: 48,
                    overflow: "hidden",
                  },
                  children: [{ type: "img", props: { src: iconDataUrl, width: 160, height: 160 } }],
                },
              },
            ]
          : []),
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", flex: 1 },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: 64, color: "white", lineHeight: 1.1 },
                  children: clip(title, 60),
                },
              },
              ...(description
                ? [
                    {
                      type: "div",
                      props: {
                        style: { fontSize: 30, color: "#a0aec0", marginTop: 16, lineHeight: 1.3 },
                        children: description,
                      },
                    },
                  ]
                : []),
              {
                type: "div",
                props: {
                  style: { fontSize: 28, color: "#68d391", marginTop: 28 },
                  children: `${itemCount} emoji · by @${creatorHandle}`,
                },
              },
            ],
          },
        },
      ],
    },
  };

  const strip: SatoriNode[] = emoji.length
    ? [
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", marginTop: 48, width: "100%" },
            children: emoji.map((src, i) => ({
              type: "img",
              props: {
                src,
                width: emojiSize,
                height: emojiSize,
                style: { marginRight: i === emoji.length - 1 ? 0 : 16, objectFit: "contain" },
              },
            })),
          },
        },
      ]
    : [];

  const element: SatoriNode = {
    type: "div",
    props: {
      style: {
        ...bgStyle,
        flexDirection: "column",
        position: "relative",
        alignItems: "flex-start",
      },
      children: [
        header,
        ...strip,
        {
          type: "div",
          props: {
            style: { position: "absolute", right: 40, bottom: 28, fontSize: 24, color: "#4a5568" },
            children: "moji.blue",
          },
        },
      ],
    },
  };

  return {
    element,
    meta: {
      title: `${pack.name} — a Bluemoji pack`,
      description: pack.description ?? `${itemCount} custom emoji, shared via moji.blue`,
    },
  };
});

const bgStyle = {
  display: "flex",
  width: "100%",
  height: "100%",
  background: "#0f1420",
  color: "white",
  alignItems: "center",
  justifyContent: "center",
  padding: CARD_PADDING,
  fontFamily: "Inter",
};
