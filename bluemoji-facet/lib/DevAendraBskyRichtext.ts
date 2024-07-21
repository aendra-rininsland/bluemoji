import { hasProp, isObj, ValidationResult, Lexicons } from "@atproto/lexicon";

// create your lexicons collection
export const lexicons = new Lexicons();

lexicons.add({
  lexicon: 1,
  id: "dev.aendra.bsky.richtext.facet#blumogi",
  defs: {
    main: {
      type: "object",
      description: "Annotation of a sub-string within rich text.",
      required: ["index", "features"],
      properties: {
        index: { type: "ref", ref: "app.bsky.richtext.facet#byteSlice" },
        features: {
          type: "array",
          items: {
            type: "union",
            refs: [
              "app.bsky.richtext.facet#mention",
              "app.bsky.richtext.facet#link",
              "app.bsky.richtext.facet#tag",
              "#blumogi",
            ],
          },
        },
      },
    },
    blumogi: {
      type: "object",
      description: "A custom Bluesky Emoji",
      required: ["type", "props"],
      properties: {
        type: { type: "string" },
        props: { type: "union", refs: ["#mfmFnProps"] },
        children: { type: "ref", ref: "#mfmChildren" },
      },
    },
  },
});

export interface Blumoji {
  symbol: string;
  [k: string]: unknown;
}

export function isBlumoji(v: unknown): v is Blumoji {
  return (
    isObj(v) &&
    hasProp(v, "$type") &&
    v.$type === "dev.aendra.bsky.richtext.facet#blumogi"
  );
}

export function validateBlumoji(v: unknown): ValidationResult {
  return lexicons.validate("dev.aendra.bsky.richtext.facet#blumogi", v);
}
