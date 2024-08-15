import AtpAgent, {
  RichTextSegment,
  RichText,
  Facet,
  AppBskyRichtextFacet,
  UnicodeString,
  Entity,
  RichTextProps,
  RichTextOpts,
  sanitizeRichText
} from "@atproto/api";
import * as BlueMojiRichtextFacet from "@aendra/lexicons/types/blue/moji/richtext/facet";
import * as BlueMojiCollectionItem from "@aendra/lexicons/types/blue/moji/collection/item";
import { detectFacets } from "./detect-facets";

export const BLUEMOJI_REGEX = new RegExp(
  ":((?!.*--)[A-Za-z0-9-]{4,20}(?<!-)):",
  "gim"
);

export class BluemojiRichTextSegment extends RichTextSegment {
  get bluemoji(): BlueMojiRichtextFacet.Main | undefined {
    const fn = this.facet?.features.find(BlueMojiRichtextFacet.isMain);
    if (BlueMojiRichtextFacet.isMain(fn)) {
      return fn;
    }
    return undefined;
  }
  isBluemoji() {
    return !!this.bluemoji;
  }
}

export const facetSort = (a: Facet, b: Facet) =>
  a.index.byteStart - b.index.byteStart;

interface BluemojiRichTextOpts extends RichTextOpts {
  did: string;
}
export class BluemojiRichText extends RichText {
  private _did?: string;

  constructor(props: RichTextProps, opts?: BluemojiRichTextOpts) {
    super(props, opts);
    this.unicodeText = new UnicodeString(props.text);
    this.facets = props.facets;
    this._did = opts?.did;
    if (!this.facets?.length && props.entities?.length) {
      this.facets = entitiesToFacets(this.unicodeText, props.entities);
    }
    if (this.facets) {
      this.facets.sort(facetSort);
    }
  }
  clone() {
    return new BluemojiRichText({
      text: this.unicodeText.utf16,
      facets: cloneDeep(this.facets)
    });
  }

  *segments(): Generator<BluemojiRichTextSegment, void, void> {
    const facets = this.facets || [];
    if (!facets.length) {
      yield new BluemojiRichTextSegment(this.unicodeText.utf16);
      return;
    }

    let textCursor = 0;
    let facetCursor = 0;
    do {
      const currFacet = facets[facetCursor];
      if (textCursor < currFacet.index.byteStart) {
        yield new BluemojiRichTextSegment(
          this.unicodeText.slice(textCursor, currFacet.index.byteStart)
        );
      } else if (textCursor > currFacet.index.byteStart) {
        facetCursor++;
        continue;
      }
      if (currFacet.index.byteStart < currFacet.index.byteEnd) {
        const subtext = this.unicodeText.slice(
          currFacet.index.byteStart,
          currFacet.index.byteEnd
        );
        if (!subtext.trim()) {
          // dont empty string entities
          yield new BluemojiRichTextSegment(subtext);
        } else {
          yield new BluemojiRichTextSegment(subtext, currFacet);
        }
      }
      textCursor = currFacet.index.byteEnd;
      facetCursor++;
    } while (facetCursor < facets.length);
    if (textCursor < this.unicodeText.length) {
      yield new BluemojiRichTextSegment(
        this.unicodeText.slice(textCursor, this.unicodeText.length)
      );
    }
  }

  async detectFacets(agent: AtpAgent): Promise<void> {
    this.facets = detectFacets(this.unicodeText);
    if (this.facets) {
      for (const facet of this.facets) {
        for (const feature of facet.features) {
          if (BlueMojiRichtextFacet.isMain(feature)) {
            const { did: repo } = agent?.session || { did: this._did };

            if (!repo) throw new Error("Bluemoji facet DID is unknown");

            const { data: record } = await agent.com.atproto.repo.getRecord({
              repo,
              rkey: feature.name.replace(/:/g, ""),
              collection: "blue.moji.collection.item"
            });

            if (BlueMojiCollectionItem.isRecord(record.value)) {
              feature.alt = record.value.alt;
              if (
                BlueMojiCollectionItem.isFormats_v0(record.value.formats) &&
                BlueMojiCollectionItem.isBytesOrBlobType_v0(
                  record.value.formats.png_128
                ) &&
                record.value.formats.png_128.blob
              ) {
                feature.blobs = {
                  $type: "blue.moji.richtext.facet#blobs_v0",
                  png_128: record.value.formats.png_128.blob.ref.toString()
                };
              }
            }
          } else if (AppBskyRichtextFacet.isMention(feature)) {
            const did = await agent
              .resolveHandle({ handle: feature.did })
              .catch((_) => undefined)
              .then((res) => res?.data.did);
            feature.did = did || "";
          }
        }
      }
      this.facets.sort(facetSort);
    }
  }
}
function cloneDeep<T>(v: T): T {
  if (typeof v === "undefined") {
    return v;
  }
  return JSON.parse(JSON.stringify(v));
}

function entitiesToFacets(text: UnicodeString, entities: Entity[]): Facet[] {
  const facets: Facet[] = [];
  for (const ent of entities) {
    if (ent.type === "link") {
      facets.push({
        $type: "app.bsky.richtext.facet",
        index: {
          byteStart: text.utf16IndexToUtf8Index(ent.index.start),
          byteEnd: text.utf16IndexToUtf8Index(ent.index.end)
        },
        features: [{ $type: "app.bsky.richtext.facet#link", uri: ent.value }]
      });
    } else if (ent.type === "mention") {
      facets.push({
        $type: "app.bsky.richtext.facet",
        index: {
          byteStart: text.utf16IndexToUtf8Index(ent.index.start),
          byteEnd: text.utf16IndexToUtf8Index(ent.index.end)
        },
        features: [{ $type: "app.bsky.richtext.facet#mention", did: ent.value }]
      });
    } else if (ent.type === "bluemoji") {
      facets.push({
        $type: "app.bsky.richtext.facet",
        index: {
          byteStart: text.utf16IndexToUtf8Index(ent.index.start),
          byteEnd: text.utf16IndexToUtf8Index(ent.index.end)
        },
        features: [
          {
            $type: "blue.moji.richtext.facet",
            name: ent.name,
            alt: ent.alt
          }
        ]
      });
    }
  }
  return facets;
}