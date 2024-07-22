import { hasProp, isObj, ValidationResult, Lexicons } from "@atproto/lexicon";
import { lexicons } from "./lexicon";

export const DevAendraBskyRichtextFacet = {
  lexicon: 1,
  id: "dev.aendra.bsky.richtext.facet",
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
              "#bluemogi",
            ],
          },
        },
      },
    },
    bluemogi: {
      type: "object",
      description: "A custom Bluesky Emoji",
      required: ["type", "props"],
      properties: {
        name: { type: "string", maxLength: 20 },
        did: { type: "string", format: "did" },
      },
    },
  },
};

export interface BluemojiFacet {
  symbol: string;
  did: string;
  [k: string]: unknown;
}

export function isBluemojiFacet(v: unknown): v is BluemojiFacet {
  return (
    isObj(v) &&
    hasProp(v, "$type") &&
    v.$type === "dev.aendra.bsky.richtext.facet#bluemoji"
  );
}

export function validateBluemojiFacet(v: unknown): ValidationResult {
  return lexicons.validate("dev.aendra.bsky.richtext.facet#bluemoji", v);
}
