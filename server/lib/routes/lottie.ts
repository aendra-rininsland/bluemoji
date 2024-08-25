import express from "express";
import { AppContext } from "../config";
import { agent } from "../agent";
import { Record } from "../../lexicon/types/blue/moji/collection/item";

const makeRouter = (ctx: AppContext) => {
  const router = express.Router();

  router.get("/lottie/:did/:name", async (req, res) => {
    const { did, name } = req.params;
    console.log(did, name);
    const { data } = await agent.com.atproto.repo.getRecord({
      repo: did,
      rkey: name,
      collection: "blue.moji.collection.item"
    });

    const record = data.value as Record;

    res.contentType("application/lottie+zip");
    res.send(record.formats.bytes);
  });

  router.post("/lottie", async (res, req) => {});

  return router;
};
export default makeRouter;
