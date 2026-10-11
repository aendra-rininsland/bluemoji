// Rasterise an SVG to PNG in the browser, so the importers can accept SVG
// artwork without ever storing (or serving) an SVG: the PNG is what becomes the
// emoji's `original`. The pure sizing helpers are separate so they can be
// unit-tested without a DOM.

/** CSS px per absolute unit */
const UNITS: Record<string, number> = {
  "": 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
};

/** An SVG length attribute in CSS px, or null for relative/unsupported values (%, em, …). */
export function parseSvgLength(v: string | null | undefined): number | null {
  const m = /^\s*(\d*\.?\d+(?:e[+-]?\d+)?)\s*(px|pt|pc|in|cm|mm)?\s*$/i.exec(v ?? "");
  if (!m) return null;
  const n = parseFloat(m[1]) * UNITS[(m[2] ?? "").toLowerCase()];
  return n > 0 && Number.isFinite(n) ? n : null;
}

export interface SvgSizeAttrs {
  width?: string | null;
  height?: string | null;
  viewBox?: string | null;
}

/** The SVG's natural size in px from its width/height/viewBox, or null if it declares none. */
export function svgNaturalSize(a: SvgSizeAttrs): { w: number; h: number } | null {
  const w = parseSvgLength(a.width);
  const h = parseSvgLength(a.height);
  const vb = (a.viewBox ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const hasVb = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0;
  if (w && h) return { w, h };
  if (hasVb) {
    const [, , vw, vh] = vb;
    if (w) return { w, h: (w * vh) / vw };
    if (h) return { w: (h * vw) / vh, h };
    return { w: vw, h: vh };
  }
  if (w || h) return { w: (w ?? h)!, h: (h ?? w)! }; // one side only, no viewBox: assume square
  return null;
}

/** Scale (up or down) so the longer side is exactly `maxSide`, keeping the aspect ratio. */
export function fitSvgSize(w: number, h: number, maxSide: number): { w: number; h: number } {
  const scale = maxSide / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

const RENDER_TIMEOUT_MS = 10_000;

/**
 * Render an SVG to a transparent PNG whose longer side is `maxSide` px.
 *
 * The SVG is loaded through an <img>, which never runs scripts or fetches
 * external resources; we additionally strip scripts, <foreignObject> (which
 * taints the canvas in some browsers), event-handler attributes and external
 * references before rendering. Limits: no web fonts, no animation (first frame).
 */
export async function rasteriseSvg(svg: Blob, maxSide = 512): Promise<Blob> {
  const doc = new DOMParser().parseFromString(await svg.text(), "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.localName !== "svg" || doc.querySelector("parsererror")) {
    throw new Error("not a valid SVG file");
  }

  doc.querySelectorAll("script, foreignObject").forEach((n) => n.remove());
  for (const el of doc.querySelectorAll("*")) {
    // Snapshot: removing from the live attribute map while iterating would skip entries
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const isHref = name === "href" || name === "xlink:href" || name.endsWith(":href");
      if (name.startsWith("on") || (isHref && !/^(#|data:image\/)/i.test(attr.value.trim()))) {
        el.removeAttribute(attr.name);
      }
    }
  }

  const natural = svgNaturalSize({
    width: root.getAttribute("width"),
    height: root.getAttribute("height"),
    viewBox: root.getAttribute("viewBox"),
  });
  const size = natural ? fitSvgSize(natural.w, natural.h, maxSide) : { w: maxSide, h: maxSide };
  // Without a viewBox the browser can't scale the drawing, so synthesise one
  if (natural && !root.hasAttribute("viewBox"))
    root.setAttribute("viewBox", `0 0 ${natural.w} ${natural.h}`);
  root.setAttribute("width", String(size.w));
  root.setAttribute("height", String(size.h));

  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" }),
  );
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("the SVG took too long to render")),
        RENDER_TIMEOUT_MS,
      );
      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error("the SVG couldn't be rendered"));
      };
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, size.w, size.h);

    const px = ctx.getImageData(0, 0, size.w, size.h).data;
    let visible = false;
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] > 0) {
        visible = true;
        break;
      }
    }
    if (!visible)
      throw new Error("the SVG rendered blank (it may rely on external fonts or images)");

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
