import { AppBskyEmbedImages } from "@atproto/api";
import { ImageClassificationSingle } from "@xenova/transformers";
import * as detect from "./detect";
import { createLabel, addTag } from "./moderate";
import { isLoggedIn } from "./agent";
import { db } from "./db";
import { CreateOp } from "./subscription";

const MAX_IRRELEVANCY = 0.25;
const MINIMUM_CONFIDENCE = 0.85;

const IGNORED_DIDS = [
  "did:plc:mcb6n67plnrlx4lg35natk2b", // nowbreezing.ntw.app
  "did:plc:ymzacrnsjirzupb4vwiazhm7", // moinbot.bsky.social
  "did:plc:gyq7t7tyn4pkqavqqv5debdp", // kctv.bsky.social
  "did:plc:l7ifpnhmxibgzxmw5i4fowea", // aerialcolorado.bsky.social
  "did:plc:ewvo3ovbzgl5tq6oklmwrapy", // zoops247.bsky.social
  "did:plc:aulhpk4m5pfpfr3hid24tmop", // gradientbot.bsky.social
  "did:plc:bb2sdgakqp3yuz2heo6jonrt", // miq.moe
  "did:plc:zwul4quy66xlgohmzq2at5jq", // adoptiedieren.nl
  "did:plc:f7qo7c4hbii7nz7mbzx6t3o4", // mykeystuart.bsky.social
  "did:plc:vqhaiylwzzxvjqfxznz3csuq", // ahistoriaemvideo.bsky.social
  "did:plc:m4jfpmor7wcmqfll22pu56ej", // colors.bsky.social
  "did:plc:ozjtqqab26axmvi3rygbtw6y", // roadside.xor.blue
  "did:plc:y3crhppe4bnnjgbqqlof6ok3", // hourlylegs.bsky.social
  "did:plc:uqsv2fby2su6dj3wstxsnzkv", // bbcradio1bot.bsky.social
  "did:plc:ywbm3iywnhzep3ckt6efhoh7", // katie tightpussy
  "did:plc:nin37dqg23nevv4x4wr3kc6d", // aboveedxw.mastodon.social.ap.brid.gy
  "did:plc:y2g5vymm2cvveec6cnspcvzo", // aboveedxw.de
  "did:plc:pj5mfw6xjh2x6cjdlyxxngra", // upnextcriterion.bsky.social
  "did:plc:dnrkktjuabxs76dop3ucwspn", // bbcasiannetworkbot.bsky.social
  "did:plc:qlbcbxs5lems6o5e3c4hsdmt", // bbcradio2bot.bsky.social
  "did:plc:om2ttmoe5t7py2jqiii5mvj3", // bbcradio1xtrabot.bsky.social
];

export const worker = async ({ data: postsToCreate }: { data: CreateOp[] }) => {
  await isLoggedIn;
  const results = new Map();

  for (const post of postsToCreate.filter(
    (d) => !IGNORED_DIDS.includes(d.author)
  )) {
    const url = post.uri
      .replace("at://", "https://bsky.app/profile/")
      .replace("app.bsky.feed.post", "post");

    if (!AppBskyEmbedImages.isMain(post.record.embed)) return;

    const { images } = post.record.embed;

    const detections: [string, ImageClassificationSingle[]][] =
      await Promise.all(
        images.map(async (d: any) => {
          const cid = d.image.ref.$link;
          const detections = await detect.classify(
            `https://cdn.bsky.app/img/feed_fullsize/plain/${post.author}/${cid}@jpeg`
          );

          return [cid, detections];
        })
      );

    for (const image of detections) {
      const [cid, dets] = image;
      results.set(cid, dets);

      const irrelevantScore =
        dets.find((d) => d.label === "irrelevant")?.score || 0;

      if (dets.length) {
        const [topDet] = dets.sort((a, b) => b.score - a.score);

        if (
          topDet.score > MINIMUM_CONFIDENCE &&
          topDet.label !== "irrelevant"
        ) {
          // OVERRIDES FOR SPECIFIC LABELS
          if (topDet.score < 0.95 && topDet.label === "instagram") return;
          if (topDet.score < 0.98 && topDet.label === "altright") return;

          await createLabel(
            post,
            cid,
            `${topDet.label}-screenshot`,
            topDet ? `${topDet.label}:${topDet.score}` : "",
            detect.MODEL_NAME_LARGE
          );
        }

        if (irrelevantScore < MAX_IRRELEVANCY || process.env.RECORD_ALL) {
          console.log(url, topDet.label, topDet.score);
          try {
            await db
              .insertInto("detections")
              .values({
                uri: url,
                blobCid: `${post.uri}/${cid}`,
                timestamp: new Date().toString(),
                topLabel: topDet.label,
                topScore: topDet.score,
                raw: JSON.stringify(dets),
              })
              .execute();
          } catch {}
        }
      }
    }

    if (
      detections.some(
        ([, dets]) =>
          !dets.some(
            (det) => det.label === "irrelevant" && det.score > MAX_IRRELEVANCY
          )
      )
    ) {
      await addTag(post, detections);
    }
  }
};
