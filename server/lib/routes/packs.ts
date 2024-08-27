import { InvalidRequestError } from "@atproto/xrpc-server";
import { Server } from "../../lexicon";
import { AppContext } from "../config";
import * as BlueMojiPacksPack from "../../lexicon/types/blue/moji/packs/pack";
import * as BlueMojiPacksDefs from "../../lexicon/types/blue/moji/packs/defs";
import { HandlerOutput as GetPackHandlerOutput } from "../../lexicon/types/blue/moji/packs/getPack";
import { HandlerOutput as GetPacksHandlerOutput } from "../../lexicon/types/blue/moji/packs/getPacks";

export default function (server: Server, ctx: AppContext) {
  server.blue.moji.packs.getActorPacks(async ({ params, req }) => {
    const did = req.cookies.did;

    const agent = await ctx.client?.restore(did);

    if (!agent) {
      throw new InvalidRequestError("Not logged in", "Unauthorized");
    }

    const { data } = await agent.com.atproto.repo.listRecords({
      repo: agent.accountDid,
      collection: "blue.moji.packs.pack",
      ...params
    });

    const packsRecords = data.records.map(({ value, cid, uri }) => ({
      cid,
      uri,
      ...(BlueMojiPacksPack.isRecord(value) ? value : {})
    })) as unknown as BlueMojiPacksDefs.PackViewBasic[]; // @TODO shrug

    return {
      encoding: "application/json",
      body: {
        packs: packsRecords,
        cursor: data.cursor
      }
    };
  });

  server.blue.moji.packs.getPack(
    async ({ input, req }): Promise<GetPackHandlerOutput> => {
      return {} as GetPackHandlerOutput;
    }
  );
  server.blue.moji.packs.getPacks(
    async ({ input, req }): Promise<GetPacksHandlerOutput> => {
      return {} as GetPacksHandlerOutput;
    }
  );
}
