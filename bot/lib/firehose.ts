import {
  OutputSchema as RepoEvent,
  isCommit
} from "@aendra/lexicons/types/com/atproto/sync/subscribeRepos";
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
// import { queue } from "./queue";

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;

    const ops = await getOpsByType(evt).catch((e) => {
      console.error("repo subscription could not handle message", e);
    });

    if (!ops || !ops.bluemoji?.length) return;
    const postsToCreate = ops.bluemoji;

    if (postsToCreate.length > 0) {
      console.dir(postsToCreate);
      // queue
      //   .createJob(postsToCreate)
      //   .timeout(30000)
      //   .backoff("exponential", 2000)
      //   .retries(5)
      //   .save();
    }
  }
}
