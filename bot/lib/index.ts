/**
 * @file
 * XBlock Twitter Screenshot Blocker
 */

import { FirehoseSubscription } from "./firehose";
import { db, migrateToLatest } from "./db";
import { isLoggedIn, agent } from "./agent";

void (async function main() {
  await migrateToLatest(db);
  await isLoggedIn;

  const firehose = new FirehoseSubscription("wss://bsky.network", db, agent);
  firehose.run(3000);
  console.info("Running...");
})();
