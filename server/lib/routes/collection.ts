import { InvalidRequestError } from "@atproto/xrpc-server";
import { Server } from "../../lexicon";
import { AppContext } from "../config";
import * as BlueMojiCollectionItem from "../../lexicon/types/blue/moji/collection/item";

export default function (server: Server, ctx: AppContext) {
  /**
   * List user's collection
   */
  server.blue.moji.collection.listCollection(async ({ params, req }) => {
    const did = req.cookies.did;

    const agent = await ctx.client?.restore(did);

    if (!agent) {
      throw new InvalidRequestError("Not logged in", "Unauthorized");
    }

    const { data } = await agent.com.atproto.repo.listRecords({
      repo: agent.accountDid,
      collection: "blue.moji.collection.item",
      ...params
    });

    const items = data.records
      .map((record) => record.value)
      .filter((d) => BlueMojiCollectionItem.isRecord(d));

    return {
      encoding: "application/json",
      body: {
        items,
        cursor: data.cursor
      }
    };
  });

  /**
   * Save emoji to collection
   */
  server.blue.moji.collection.saveToCollection(async ({ input, req }) => {
    const did = req.cookies.did;

    const agent = await ctx.client?.restore(did);

    if (!agent) {
      throw new InvalidRequestError("Not logged in", "Unauthorized");
    }

    const { data: originalData } = await agent.com.atproto.repo.getRecord({
      repo: agent.accountDid,
      collection: "blue.moji.collection.item",
      rkey: input.body.name
    });

    const originalRecord = originalData.value;

    if (!BlueMojiCollectionItem.isRecord(originalRecord)) {
      throw new InvalidRequestError(
        "Invalid source record.",
        "InvalidSourceRecord"
      );
    }

    const record: BlueMojiCollectionItem.Record = {
      ...originalRecord,
      copyOf: originalData.uri
    };

    const { data } = await agent.com.atproto.repo.createRecord({
      repo: agent.accountDid,
      collection: "blue.moji.collection.item",
      record
    });

    return {
      encoding: "application/json",
      body: { uri: data.uri, item: record }
    };
  });
}
