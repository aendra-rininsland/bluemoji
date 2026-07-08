import { defineOG } from "@hatk/hatk/opengraph";
import { handlesForDids } from "../_pack-views.ts";

interface PackRow {
  uri: string;
  did: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

const pdsCache = new Map<string, string>();

async function resolvePds(did: string): Promise<string | null> {
  const cached = pdsCache.get(did);
  if (cached) return cached;
  try {
    const isWeb = did.startsWith("did:web:");
    const url = isWeb
      ? `https://${did.slice("did:web:".length)}/.well-known/did.json`
      : `https://plc.directory/${did}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = (await res.json()) as { service?: { type: string; serviceEndpoint: string }[] };
    const svc = doc.service?.find((s) => s.type === "AtprotoPersonalDataServer");
    if (!svc?.serviceEndpoint) return null;
    pdsCache.set(did, svc.serviceEndpoint);
    return svc.serviceEndpoint;
  } catch {
    return null;
  }
}

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

export default defineOG("/og/packs/:handle/:rkey", async (ctx) => {
  const { handle, rkey } = ctx.params as { handle: string; rkey: string };
  const bg = { type: "div", props: { style: bgStyle, children: "moji.blue" } };

  const did = await resolveDid(handle);
  if (!did) return { element: bg };

  const uri = `at://${did}/blue.moji.packs.pack/${rkey}`;
  const rows = (await ctx.db.query(`SELECT * FROM "blue.moji.packs.pack" WHERE uri = $1`, [
    uri,
  ])) as PackRow[];
  const pack = rows[0];
  if (!pack) return { element: bg };

  const counts = await ctx.count("blue.moji.packs.packitem", "pack", [uri]);
  const itemCount = counts.get(uri) ?? 0;

  const handles = await handlesForDids(ctx, [did]);
  const creatorHandle = handles.get(did) ?? "handle.invalid";

  let iconDataUrl: string | null = null;
  const iconCid = blobRefCid(parseJson(pack.icon));
  if (iconCid) {
    const pds = await resolvePds(pack.did);
    if (pds) {
      const url = `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(pack.did)}&cid=${encodeURIComponent(iconCid)}`;
      iconDataUrl = await ctx.fetchImage(url);
    }
  }

  const element = {
    type: "div",
    props: {
      style: bgStyle,
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              width: 160,
              height: 160,
              borderRadius: 24,
              background: "#26314a",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 72,
              marginRight: 48,
              overflow: "hidden",
            },
            children: iconDataUrl
              ? { type: "img", props: { src: iconDataUrl, width: 160, height: 160 } }
              : "📦",
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", maxWidth: 820 },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: 56, fontWeight: 700, color: "white" },
                  children: pack.name,
                },
              },
              ...(pack.description
                ? [
                    {
                      type: "div",
                      props: {
                        style: { fontSize: 30, color: "#a0aec0", marginTop: 16 },
                        children: pack.description.slice(0, 140),
                      },
                    },
                  ]
                : []),
              {
                type: "div",
                props: {
                  style: { fontSize: 28, color: "#68d391", marginTop: 32 },
                  children: `${itemCount} emoji · by @${creatorHandle}`,
                },
              },
            ],
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
  padding: 64,
  fontFamily: "Inter",
};
