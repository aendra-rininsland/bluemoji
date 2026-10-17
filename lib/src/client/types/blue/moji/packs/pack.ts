/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as BlueMojiRichtextFacet from "../richtext/facet.js";
import type * as ComAtprotoLabelDefs from "../../../com/atproto/label/defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "blue.moji.packs.pack";

export interface Main {
  $type: "blue.moji.packs.pack";
  name: string;
  description?: string;
  descriptionFacets?: BlueMojiRichtextFacet.Main[];
  icon?: BlobRef;
  adultOnly: boolean;
  /** URL of where this was originally published, if it was re-uploaded from somewhere else (an artist's page, another site, a Mastodon server). Informational provenance, self-asserted by the record's owner and not verified. Clients SHOULD only render http(s) URLs as links and MUST NOT navigate to other schemes (javascript:, data:, …). */
  source?: string;
  /** SPDX license expression (https://spdx.org/licenses/) describing how this may be reused, e.g. 'CC-BY-4.0', 'CC0-1.0' or 'MIT OR Apache-2.0'; use a 'LicenseRef-…' identifier for terms with no SPDX id. Absent means unspecified, which is NOT the same as public domain. Self-asserted by the record's owner: not verified, and not legal advice. */
  license?: string;
  createdAt: string;
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string };
  [k: string]: unknown;
}

const hashMain = "main";

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain);
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true);
}

export { type Main as Record, isMain as isRecord, validateMain as validateRecord };
