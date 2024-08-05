import { describe, it } from "node:test";
import assert from "node:assert";
import { BskyAgent, RichText } from "@atproto/api";
import { register } from "./bluemoji";

register("did:plc:kkf4naxqmweop7dv4l2iqqf5"); // @TODO This feels wrong...

describe("blue.moji.richtext.facet", () => {
  const text =
    "Hello @aendra.com, check out this link: https://example.com :party-heart:";

  describe(`detecting facets in string: ${text}`, async () => {
    const agent = new BskyAgent({ service: "https://api.bsky.social" });

    // creating richtext
    const rt = new RichText({
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

    it("still renders mentions", () => {
      const [mentionedUser] = mention.features;
      assert.strictEqual(mention.$type, "app.bsky.richtext.facet");
      assert.strictEqual(mentionedUser.did, "did:plc:kkf4naxqmweop7dv4l2iqqf5");
      assert.strictEqual(
        mentionedUser.$type,
        "app.bsky.richtext.facet#mention"
      );
    });

    it("still renders links", () => {
      const [linkedUri] = link.features;
      assert.strictEqual(linkedUri.$type, "app.bsky.richtext.facet#link");
      assert.strictEqual(linkedUri.uri, "https://example.com");
    });

    it("now also renders emoji! ✨", () => {
      const [bluemojiFeature] = bluemoji.features;
      assert.strictEqual(
        bluemojiFeature.$type,
        "blue.moji.richtext.facet#bluemoji"
      );
      console.log(bluemojiFeature);
    });
  });
});
