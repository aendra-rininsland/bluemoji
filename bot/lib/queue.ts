import Queue from "bee-queue";
import { worker } from "./worker";

export const queue = new Queue("posts", {
  activateDelayedJobs: true,
  // removeOnSuccess: true,
  // removeOnFailure: true,
});

queue.process(20, worker);
