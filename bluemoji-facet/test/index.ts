import { BskyAgent } from "@atproto/api";
import bluemogi, { BLUEMOJI_REGEX } from "../lib";

const RichText = bluemogi();
const text =
  "Hello @alice.com, check out this link: https://example.com :party-heart:";

(async () => {
  const agent = new BskyAgent({ service: "https://bsky.social" });

  // creating richtext
  const rt = new RichText({
    text,
  });

  await rt.detectFacets(agent); // automatically detects mentions and links

  const postRecord = {
    $type: "app.bsky.feed.post",
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
  };

  console.log(postRecord.facets);
})();
