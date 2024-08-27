import AtpAgent, { AtpAgentOptions } from "@atproto/api";
import { BlueNS } from "./client";
import * as BlueMojiCollectionItem from "./client/types/blue/moji/collection/item";

type BluemojiAgentOpts = AtpAgentOptions;

export class BluemojiAgent extends AtpAgent {
  blue = new BlueNS(this);

  constructor(opts: BluemojiAgentOpts) {
    super(opts);
  }

  async createBluemoji(
    record: Partial<BlueMojiCollectionItem.Record> &
      Omit<BlueMojiCollectionItem.Record, "createdAt">
  ) {
    record.createdAt ||= new Date().toISOString();
    return this.blue.moji.collection.item.create(
      { repo: this.accountDid },
      record as BlueMojiCollectionItem.Record
    );
  }

  getBluemoji: typeof this.blue.moji.collection.item.get = (params) =>
    this.blue.moji.collection.item.get(params)

  listBluemoji: typeof this.blue.moji.collection.item.list = (params) =>
    this.blue.moji.collection.item.list(params)
}
