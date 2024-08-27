import { describe, it } from "node:test";
import assert from "node:assert";
import { AtpSessionData, AtpAgent } from "@atproto/api";
import { BluemojiRichText } from "./BluemojiRichText";
import {
  Formats_v0,
  Record
} from "../../lexicon/types/blue/moji/collection/item";

const stubRecord: Record = {
  $type: "blue.moji.collection.item",
  name: ":test:",
  alt: "test",
  createdAt: "2020-02-02T22:22:22Z",
  formats: {
    $type: "blue.moji.collection.item#formats_v0",
    png_128: {
      ref: "123"
    },
    apng_128: "apng_bytes",
    lottie: "dotlottie_bytes"
  },
  adultOnly: false,
  fallbackText: "◌"
};

describe("BluemojiRichText", () => {
  const text =
    "Hello @aendra.com, check out this link: https://example.com :blue-kiss:";

  it(`detects facets in string: ${text}`, async (t) => {
    const agent = new AtpAgent({ service: "https://api.bsky.social" });
    t.mock.method(agent, "login", () => Promise.resolve(true));
    t.mock.method(agent.com.atproto.repo, "getRecord", () =>
      Promise.resolve({ data: { value: stubRecord } })
    );

    agent.session = {
      did: "did:plc:kmzpsik7s5y5fwu7nnkngfx4"
    } as AtpSessionData;

    // creating richtext
    const rt = new BluemojiRichText({
      text
    });

    await rt.detectFacets(agent); // automatically detects mentions and links

    const postRecord = {
      $type: "app.bsky.feed.post",
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString()
    };

    const [mention, link, bluemoji] = postRecord.facets || [];

    await t.test("still facets mentions", () => {
      const [mentionedUser] = mention.features;
      assert.strictEqual(mention.$type, "app.bsky.richtext.facet");
      assert.strictEqual(mentionedUser.did, "did:plc:kkf4naxqmweop7dv4l2iqqf5");
      assert.strictEqual(
        mentionedUser.$type,
        "app.bsky.richtext.facet#mention"
      );
    });

    await t.test("still facets links", () => {
      const [linkedUri] = link.features;
      assert.strictEqual(linkedUri.$type, "app.bsky.richtext.facet#link");
      assert.strictEqual(linkedUri.uri, "https://example.com");
    });

    await t.test("now also facets emoji! ✨", () => {
      const [bluemojiFeature] = bluemoji.features;
      assert.strictEqual(bluemojiFeature.$type, "blue.moji.richtext.facet");
      assert.strictEqual(bluemojiFeature.name, ":blue-kiss:");
      assert.strictEqual(
        bluemojiFeature.did,
        "did:plc:kmzpsik7s5y5fwu7nnkngfx4"
      );
      assert.strictEqual(
        (bluemojiFeature.formats as Formats_v0).png_128,
        "123"
      );
      assert.strictEqual(
        (bluemojiFeature.formats as Formats_v0).apng_128,
        true
      );
      assert.strictEqual((bluemojiFeature.formats as Formats_v0).lottie, true);
    });
  });
});
