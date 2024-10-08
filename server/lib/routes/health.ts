import express from "express";
import { sql } from "kysely";
import { AppContext } from "../config";

export const createRouter = (ctx: AppContext): express.Router => {
  const router = express.Router();

  router.get("/xrpc/_health", async function (req, res) {
    const { version } = ctx.cfg.service;
    try {
      await sql`select 1`.execute(ctx.db);
    } catch (err) {
      req.log.error(err, "failed health check");
      return res.status(503).send({ version, error: "Service Unavailable" });
    }
    res.send({ version });
  });

  return router;
};
