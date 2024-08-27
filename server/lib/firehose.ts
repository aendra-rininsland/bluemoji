import {
  Commit as RepoEvent,
  isCommit
} from "../lexicon/types/com/atproto/sync/subscribeRepos";
import { FirehoseSubscriptionBase, getOpsByType } from "./subscription";
import { addToActionsQueue } from "./actions";

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return;

    const ops = await getOpsByType(evt).catch((e) => {
      console.error("repo subscription could not handle message", e);
    });

    if (!ops || !ops.bluemoji?.length) return;
    const postsToCreate = ops.bluemoji;

    if (postsToCreate.length > 0) {
      postsToCreate.forEach(addToActionsQueue);
    }
  }
}
