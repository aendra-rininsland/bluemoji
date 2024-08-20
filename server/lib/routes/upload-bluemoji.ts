import { InvalidRequestError } from "@atproto/xrpc-server";
import { Server } from "../../lexicons";
import { validateAuth } from "../auth";
import { AtUri } from "@atproto/syntax";
import { AppContext } from "../config";

export default function (server: Server, ctx: AppContext) {
  server.blue.moji.collection.putItem(async ({ params, req }) => {
    return {
      encoding: "application/json",
      body: body,
    };
  });
}
