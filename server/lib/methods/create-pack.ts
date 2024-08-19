import { InvalidRequestError } from "@atproto/xrpc-server";
import { Server } from "../../lexicons";
import { validateAuth } from "../auth";
import { AtUri } from "@atproto/syntax";
import { AppContext } from "../config";
import { agent } from "../agent";

export default function (server: Server, ctx: AppContext) {
  server.blue.moji.collection.putItem({
    auth: ctx.authVerifier.standard,
    handler: async ({ input, auth }) => {
      await agent.resumeSession(auth.credentials);
      return {
        encoding: "application/json",
        body: body,
      };
    },
  });
}
