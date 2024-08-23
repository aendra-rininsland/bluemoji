import { InvalidRequestError } from "@atproto/xrpc-server";
import { Server } from "../../lexicons";
import { AppContext } from "../config";
import { BlueMojiCollectionItem } from "@aendra/lexicons";

export default function (server: Server, ctx: AppContext) {
  server.blue.moji.collection.putItem(async ({ input, req }) => {
    const did = req.cookies.did;

    const agent = await ctx.client?.restore(did);

    if (!agent) {
      throw new InvalidRequestError("Not logged in", "Unauthorized");
    }

    const record: BlueMojiCollectionItem.Record = {
      ...input.body.item,
      fallbackText: "◌", // TODO make user-editable
      createdAt: new Date().toISOString()
    };

    const { data } = await agent.com.atproto.repo.createRecord({
      repo: agent.accountDid,
      collection: "blue.moji.collection.item",
      record
    });

    return {
      encoding: "application/json",
      body: { uri: data.uri }
    };
  });
}
