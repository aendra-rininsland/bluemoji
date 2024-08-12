import { describe, it } from "node:test";
import assert from "node:assert";
import { BskyAgent } from "@atproto/api";
import { BluemojiRichText } from "./bluemoji";
import { Blobs_v0 } from "@aendra/lexicons/types/blue/moji/richtext/facet";

describe("BluemojiRichText", () => {
  const text =
    "Hello @aendra.com, check out this link: https://example.com :blue-kiss:";

  describe(`detecting facets in string: ${text}`, async () => {
    const agent = new BskyAgent({ service: "https://api.bsky.social" });

    // creating richtext
    const rt = new BluemojiRichText(
      {
        text
      },
      { did: "did:plc:kmzpsik7s5y5fwu7nnkngfx4" }
    );

    await rt.detectFacets(agent); // automatically detects mentions and links

    const postRecord = {
      $type: "app.bsky.feed.post",
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString()
    };

    const [mention, link, bluemoji] = postRecord.facets || [];

    it("still facets mentions", () => {
      const [mentionedUser] = mention.features;
      assert.strictEqual(mention.$type, "app.bsky.richtext.facet");
      assert.strictEqual(mentionedUser.did, "did:plc:kkf4naxqmweop7dv4l2iqqf5");
      assert.strictEqual(
        mentionedUser.$type,
        "app.bsky.richtext.facet#mention"
      );
    });

    it("still facets links", () => {
      const [linkedUri] = link.features;
      assert.strictEqual(linkedUri.$type, "app.bsky.richtext.facet#link");
      assert.strictEqual(linkedUri.uri, "https://example.com");
    });

    it("now also facets emoji! ✨", () => {
      const [bluemojiFeature] = bluemoji.features;
      assert.strictEqual(bluemojiFeature.$type, "blue.moji.richtext.facet");
      assert.strictEqual(bluemojiFeature.name, ":blue-kiss:");
      assert.strictEqual(
        (bluemojiFeature.blobs as Blobs_v0).png_128,
        "bafkreiemu6c7zhjh5hjyimd7kel4jbm7y2qnhxldpc6lqno4iprbjuv3rq"
      );
    });
  });
});
