import { hasProp, isObj, ValidationResult } from "@atproto/lexicon";
import { lexicons } from "./lexicon";

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
