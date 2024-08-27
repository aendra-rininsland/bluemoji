import PQueue from "p-queue";
import { createImagePost } from "./createImagePost";

const ACTIONS = [createImagePost];

const queue = new PQueue();

export const addToActionsQueue = (d: unknown) => {
  // return queue.add(() =>
  //   ACTIONS.reduce(async (a, action) => {
  //     const results = await a;
  //     return [...results, await action(results)];
  //   }, Promise.resolve(d))
  // );
};
