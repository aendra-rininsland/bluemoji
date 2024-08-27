import express from "express";
import { AppContext } from "../config";
// import { agent } from "../agent";
// import { sharpFromApng, ImageData } from "sharp-apng";

const makeRouter = (ctx: AppContext) => {
  const router = express.Router();

  router.get("/render/:did/:name", async (req, res) => {});

  return router;
};
export default makeRouter;
