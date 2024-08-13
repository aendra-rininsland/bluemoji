import express from "express";
import { AppContext } from "../config";
import { agent } from "../agent";
import { sharpFromApng, ImageData } from "sharp-apng";

const makeRouter = (ctx: AppContext) => {
  const router = express.Router();

  router.get("/blob/:did/:cid", async (req, res) => {
    const { did, cid } = req.params;
    console.log(did, cid);
    const blob = await agent.com.atproto.sync.getBlob({ did, cid });
    const buf = Buffer.from(blob.data);

    const { image } = (await sharpFromApng(
      buf,
      { format: "rgba4444" },
      // { transparent: true },
      true
    )) as ImageData;

    res.contentType("image/webp");
    res.send(await image?.webp().toBuffer());
  });

  return router;
};
export default makeRouter;
