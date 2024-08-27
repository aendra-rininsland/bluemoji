import AtpAgent, { AtpAgentOptions } from "@atproto/api";
import { BlueNS } from "./client";
import * as BlueMojiCollectionItem from "./client/types/blue/moji/collection/item";
import * as BlueMojiPack from "./client/types/blue/moji/packs/pack";
import * as BlueMojiPackItem from "./client/types/blue/moji/packs/packitem";

type BluemojiAgentOpts = AtpAgentOptions;

export class BluemojiAgent extends AtpAgent {
  blue = new BlueNS(this);

  constructor(opts: BluemojiAgentOpts) {
    super(opts);
  }

  // Bluemoji Collection API
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
    this.blue.moji.collection.item.get(params);

  listBluemoji: typeof this.blue.moji.collection.item.list = (params) =>
    this.blue.moji.collection.item.list(params);

  // Packs shorthand
  async createPack(
    record: Partial<BlueMojiPack.Record> &
      Omit<BlueMojiPack.Record, "createdAt">
  ) {
    record.createdAt ||= new Date().toISOString();
    return this.blue.moji.collection.item.create(
      { repo: this.accountDid },
      record as BlueMojiCollectionItem.Record
    );
  }

  listPacks: typeof this.blue.moji.packs.getActorPacks = (params) =>
    this.blue.moji.packs.getActorPacks(params);

  listUserPacks: typeof this.blue.moji.packs.getPacks = (params) =>
    this.blue.moji.packs.getPacks(params);

  async addItemToPack(emoji_uri: string, pack_uri: string) {
    return this.blue.moji.packs.packitem.create({ repo: this.accountDid }, {
      subject: emoji_uri,
      pack: pack_uri,
      createdAt: new Date().toISOString()
    } as BlueMojiPackItem.Record);
  }
}
