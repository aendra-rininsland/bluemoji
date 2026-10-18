/**
 * @file
 * This facilitates rendering of Bluemoji in a variety of formats.
 *
 * `render()` never trusts the facet. The `did`, `formats`, `alt` and
 * `adultOnly` on a facet are written by the poster and not checked by the PDS,
 * so it looks the emoji up with `verifyEmojiClaim()` (see ../verify) and draws
 * what the real item record says. If the emoji can't be verified (missing,
 * taken down, unreachable) it returns undefined and the caller shows the
 * `:name:` text.
 */

export * as lottie from "./renderers/lottie";
export * as png from "./renderers/apng";
export * as blob from "./renderers/blob";

import type * as BlueMojiRichTextFacet from "../client/types/blue/moji/richtext/facet";
import { renderLottie, typedArrayToBuffer } from "./renderers/lottie";
import { renderApngAsImg } from "./renderers/apng";
import { resolvePdsEndpoint, verifyEmojiClaim, type ItemView, type VerifyOptions } from "../verify";

export interface RenderParams {
  /** How to look the emoji up (index, AppViews, direct PDS). Defaults to the owner's PDS. */
  verify?: VerifyOptions;
  /**
   * URL for one of the emoji's blobs. Default: the owner's PDS
   * (`com.atproto.sync.getBlob`). Pass your own to go through an image proxy
   * or CDN.
   */
  blobUrl?: (did: string, cid: string) => string | Promise<string>;
  width?: number;
  height?: number;
  /** Lottie only: return the raw bytes (e.g. for React Native) instead of a canvas. */
  raw?: boolean;
  /** Lottie only: return `{ canvas, player }` so the caller can control playback. */
  player?: boolean;
  /**
   * What to do with an emoji its owner marked adult-only: "show" (default)
   * renders it with `data-adult-only="true"` so you can blur it, "hide"
   * returns undefined.
   */
  adult?: "show" | "hide";
  /**
   * Draw an emoji a trusted labeler (`verify.labelers`) has marked
   * `bluemoji-abusive` or `bluemoji-impersonation`. By default these render as
   * nothing, so the caller falls back to the `:name:` text.
   */
  showLabelled?: boolean;
  fetch?: typeof globalThis.fetch;
}

/** Highest-fidelity format first. */
const PREFERENCE = ["lottie", "apng_128", "gif_128", "webp_128", "png_128"] as const;
type FormatKey = (typeof PREFERENCE)[number];

export type Renderable =
  | { kind: "blob"; format: FormatKey; cid: string }
  | { kind: "bytes"; format: "lottie" | "apng_128"; bytes: Uint8Array };

/** The CID in a blob reference, in whichever shape it arrives (JSON, CBOR, or a bare string). */
export function blobCid(ref: unknown): string | null {
  if (typeof ref === "string") return ref;
  if (!ref || typeof ref !== "object") return null;
  const r = ref as { ref?: unknown; $link?: unknown };
  if (typeof r.$link === "string") return r.$link;
  if (typeof r.ref === "string") return r.ref;
  if (r.ref && typeof r.ref === "object") {
    const inner = r.ref as { $link?: unknown; toString?: () => string };
    if (typeof inner.$link === "string") return inner.$link;
    const s = inner.toString?.();
    if (s && s !== "[object Object]") return s;
  }
  return null;
}

function decodeBytes(v: unknown): Uint8Array | null {
  if (v instanceof Uint8Array) return v;
  const b64 = (v as { $bytes?: unknown } | null)?.$bytes;
  if (typeof b64 !== "string") return null;
  try {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * Choose what to draw from a *verified* item's formats. Deprecated `formats_v0`
 * keeps lottie/apng as inline bytes; everything else (and all of v1) is a blob.
 */
export function pickRenderable(item: Pick<ItemView, "formats">): Renderable | null {
  const formats = (item.formats ?? {}) as Record<string, unknown>;
  for (const key of PREFERENCE) {
    const value = formats[key];
    if (value == null) continue;
    const cid = blobCid(value);
    if (cid) return { kind: "blob", format: key, cid };
    if (key === "lottie" || key === "apng_128") {
      const bytes = decodeBytes(value);
      if (bytes) return { kind: "bytes", format: key, bytes };
    }
  }
  return null;
}

export async function render(
  _agent: unknown, // kept for compatibility with the old signature; no longer used
  facet: Pick<BlueMojiRichTextFacet.Main, "did" | "name">,
  params: RenderParams = {},
) {
  try {
    const verified = await verifyEmojiClaim(
      { did: facet.did, name: facet.name },
      { fetch: params.fetch, ...params.verify },
    );
    if (!verified) return undefined;

    const { item } = verified;
    if (item.adultOnly && params.adult === "hide") return undefined;
    if (
      !params.showLabelled &&
      verified.labels?.some((v) => v === "bluemoji-abusive" || v === "bluemoji-impersonation")
    ) {
      return undefined;
    }

    const what = pickRenderable(item);
    if (!what) throw new Error("This Bluemoji has no renderable format");
    const size = { width: params.width ?? 128, height: params.height ?? 128 };

    let el: unknown;
    if (what.kind === "bytes") {
      el =
        what.format === "lottie"
          ? renderLottie(what.bytes, { ...size, raw: params.raw, player: params.player } as never)
          : renderApngAsImg(what.bytes, size as never);
    } else {
      const url = await (params.blobUrl ?? defaultBlobUrl(item.did ?? facet.did, params))(
        item.did ?? facet.did,
        what.cid,
      );
      if (what.format === "lottie") {
        const f = params.fetch ?? globalThis.fetch;
        const res = await f(url);
        if (!res.ok) throw new Error(`Could not fetch the Lottie file (${res.status})`);
        el = renderLottie(new Uint8Array(await res.arrayBuffer()), {
          ...size,
          raw: params.raw,
          player: params.player,
        } as never);
      } else {
        const img = document.createElement("img");
        img.width = size.width;
        img.height = size.height;
        img.src = url;
        el = img;
      }
    }

    if (el && typeof el === "object" && "setAttribute" in el) {
      const node = el as HTMLElement;
      node.setAttribute("alt", item.alt ?? item.name);
      node.setAttribute("title", item.name);
      if (item.adultOnly) node.setAttribute("data-adult-only", "true");
    }
    return el;
  } catch (e) {
    console.error(e);
  }
}

function defaultBlobUrl(did: string, params: RenderParams) {
  let pds: Promise<string | null> | undefined;
  return async (_did: string, cid: string) => {
    pds ??= resolvePdsEndpoint(did, { fetch: params.fetch, ...params.verify });
    const base = await pds;
    if (!base) throw new Error("Could not find the PDS for this Bluemoji");
    return `${base}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
  };
}

export { typedArrayToBuffer };
