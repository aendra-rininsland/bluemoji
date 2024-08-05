import { ImageClassificationSingle } from "@xenova/transformers";
import { agent, isLoggedIn } from "./agent";
import { MODEL_NAME } from "./detect";
import { Record } from "@atproto/api/dist/client/types/app/bsky/feed/post";
import { CreateOp } from "./subscription";

export const createLabel = async (
  post: CreateOp,
  blobCid: string,
  label: string = "uncategorised-screenshot",
  score: number | string,
  model: string = MODEL_NAME
) => {
  await isLoggedIn;
  try {
    const { uri, cid } = post;

    return agent.api.tools.ozone.moderation.emitEvent(
      {
        // specify the label event
        event: {
          $type: "tools.ozone.moderation.defs#modEventLabel",
          createLabelVals: [label],
          negateLabelVals: [],
          comment: `Inferred by model ${model} (${score})`,
        },
        // specify the labeled post by strongRef
        subject: {
          $type: "com.atproto.repo.strongRef",
          uri,
          cid,
        },
        // put in the rest of the metadata
        createdBy: agent.session!.did,
        createdAt: new Date().toISOString(),
        subjectBlobCids: [blobCid],
      },
      {
        encoding: "application/json",
        headers: {
          "atproto-proxy": `${agent.session!.did}#atproto_labeler`,
        },
      }
    );
  } catch (e) {
    console.error(e);
  }
};

export const addTag = async (post: CreateOp, detections: any) => {
  await isLoggedIn;
  try {
    const { uri, cid } = post;

    return agent.api.tools.ozone.moderation.emitEvent(
      {
        // specify the label event
        event: {
          $type: "tools.ozone.moderation.defs#modEventTag",
          add: [`model:${MODEL_NAME}`],
          remove: [],
          comment: detections
            .map(
              (d: [string, ImageClassificationSingle[]]) =>
                `${d[0]}:\n\n${d[1].map((dd) => JSON.stringify(dd)).join("\n")}`
            )
            .join("\n\n"),
        },
        // specify the labeled post by strongRef
        subject: {
          $type: "com.atproto.repo.strongRef",
          uri,
          cid,
        },
        // put in the rest of the metadata
        createdBy: agent.session!.did,
        createdAt: new Date().toISOString(),
        subjectBlobCids: [],
      },
      {
        encoding: "application/json",
        headers: {
          "atproto-proxy": `${agent.session!.did}#atproto_labeler`,
        },
      }
    );
  } catch (e) {
    console.error(e);
  }
};

// export const createReport = async (
//   post: AppBskyFeedDefs.PostView,
//   detections: [string, ImageClassificationSingle[]][] = []
// ) => {
//   const bestLabel = detections
//     .map(
//       ([k, dts]) =>
//         dts
//           .filter(
//             (d) =>
//               !["twitter", "unrecognised-screenshot", "uncategorised"].includes(
//                 d.label
//               )
//           )
//           .sort((a, b) => b.score - a.score)
//           .shift()!
//     )
//     .sort(
//       (a: ImageClassificationSingle, b: ImageClassificationSingle) =>
//         b.score - a.score
//     )
//     .shift();

//   if (bestLabel && bestLabel.score > 0.2) {
//     try {
//       const res = await agent.com.atproto.moderation.createReport(
//         {
//           reasonType: "com.atproto.moderation.defs#reasonOther",
//           reason: `${bestLabel.label} (${bestLabel.score})`,
//           subject: {
//             $type: "com.atproto.repo.strongRef",
//             uri: post.uri,
//             cid: post.cid,
//           },
//         },
//         {
//           encoding: "application/json",
//           headers: {
//             "atproto-proxy": `${agent.session?.did}#atproto_labeler`,
//           },
//         }
//       );

//       return { success: true, data: res };
//     } catch (e) {
//       console.error(e);
//       return { success: false };
//     }
//   }
// };
