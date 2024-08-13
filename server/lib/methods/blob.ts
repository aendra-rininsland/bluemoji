import express from "express";
import { AppContext } from "../config";
import { agent } from "../agent";
import { sharpFromApng } from "sharp-apng";
import webp from "webp-wasm";
import { decode, toRGBA8 } from "upng-js";

const makeRouter = (ctx: AppContext) => {
  const router = express.Router();

  router.get("/blob/:did/:cid", async (req, res) => {
    const { did, cid } = req.params;
    console.log(did, cid);
    const blob = await agent.com.atproto.sync.getBlob({ did, cid });
    const decoded = decode(blob.data);
    const [rgba8] = toRGBA8(decoded);
    const encoded = await new Promise((res, rej) => {
      const imgdata = new ImageData(
        new Uint8ClampedArray(rgba8),
        decoded.width,
        decoded.height
      );
      return webp.encode(imgdata, {}, (err, data) => {
        if (err) rej(err);
        res(data);
      });
    });

    res.contentType("image/webp");
    res.send(encoded);
  });

  return router;
};
export default makeRouter;
