/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { XrpcClient, type FetchHandler, type FetchHandlerOptions } from "@atproto/xrpc";
import { schemas } from "./lexicons.js";
import { CID } from "multiformats/cid";
import { type OmitKey, type Un$Typed } from "./util.js";
import * as AppBskyActorDefs from "./types/app/bsky/actor/defs.js";
import * as AppBskyEmbedDefs from "./types/app/bsky/embed/defs.js";
import * as AppBskyEmbedExternal from "./types/app/bsky/embed/external.js";
import * as AppBskyEmbedImages from "./types/app/bsky/embed/images.js";
import * as AppBskyEmbedRecord from "./types/app/bsky/embed/record.js";
import * as AppBskyEmbedRecordWithMedia from "./types/app/bsky/embed/recordWithMedia.js";
import * as AppBskyEmbedVideo from "./types/app/bsky/embed/video.js";
import * as AppBskyFeedDefs from "./types/app/bsky/feed/defs.js";
import * as AppBskyFeedPostgate from "./types/app/bsky/feed/postgate.js";
import * as AppBskyFeedThreadgate from "./types/app/bsky/feed/threadgate.js";
import * as AppBskyGraphDefs from "./types/app/bsky/graph/defs.js";
import * as AppBskyLabelerDefs from "./types/app/bsky/labeler/defs.js";
import * as AppBskyNotificationDefs from "./types/app/bsky/notification/defs.js";
import * as AppBskyRichtextFacet from "./types/app/bsky/richtext/facet.js";
import * as BlueMojiCollectionDefs from "./types/blue/moji/collection/defs.js";
import * as BlueMojiCollectionGetItem from "./types/blue/moji/collection/getItem.js";
import * as BlueMojiCollectionItem from "./types/blue/moji/collection/item.js";
import * as BlueMojiCollectionListCollection from "./types/blue/moji/collection/listCollection.js";
import * as BlueMojiCollectionPutItem from "./types/blue/moji/collection/putItem.js";
import * as BlueMojiCollectionSaveToCollection from "./types/blue/moji/collection/saveToCollection.js";
import * as BlueMojiEmbedSticker from "./types/blue/moji/embed/sticker.js";
import * as BlueMojiPacksDefs from "./types/blue/moji/packs/defs.js";
import * as BlueMojiPacksGetActorPacks from "./types/blue/moji/packs/getActorPacks.js";
import * as BlueMojiPacksGetPack from "./types/blue/moji/packs/getPack.js";
import * as BlueMojiPacksGetPacks from "./types/blue/moji/packs/getPacks.js";
import * as BlueMojiPacksPack from "./types/blue/moji/packs/pack.js";
import * as BlueMojiPacksPackitem from "./types/blue/moji/packs/packitem.js";
import * as BlueMojiRichtextFacet from "./types/blue/moji/richtext/facet.js";
import * as ComAtprotoLabelDefs from "./types/com/atproto/label/defs.js";
import * as ComAtprotoModerationDefs from "./types/com/atproto/moderation/defs.js";
import * as ComAtprotoRepoStrongRef from "./types/com/atproto/repo/strongRef.js";

export * as AppBskyActorDefs from "./types/app/bsky/actor/defs.js";
export * as AppBskyEmbedDefs from "./types/app/bsky/embed/defs.js";
export * as AppBskyEmbedExternal from "./types/app/bsky/embed/external.js";
export * as AppBskyEmbedImages from "./types/app/bsky/embed/images.js";
export * as AppBskyEmbedRecord from "./types/app/bsky/embed/record.js";
export * as AppBskyEmbedRecordWithMedia from "./types/app/bsky/embed/recordWithMedia.js";
export * as AppBskyEmbedVideo from "./types/app/bsky/embed/video.js";
export * as AppBskyFeedDefs from "./types/app/bsky/feed/defs.js";
export * as AppBskyFeedPostgate from "./types/app/bsky/feed/postgate.js";
export * as AppBskyFeedThreadgate from "./types/app/bsky/feed/threadgate.js";
export * as AppBskyGraphDefs from "./types/app/bsky/graph/defs.js";
export * as AppBskyLabelerDefs from "./types/app/bsky/labeler/defs.js";
export * as AppBskyNotificationDefs from "./types/app/bsky/notification/defs.js";
export * as AppBskyRichtextFacet from "./types/app/bsky/richtext/facet.js";
export * as BlueMojiCollectionDefs from "./types/blue/moji/collection/defs.js";
export * as BlueMojiCollectionGetItem from "./types/blue/moji/collection/getItem.js";
export * as BlueMojiCollectionItem from "./types/blue/moji/collection/item.js";
export * as BlueMojiCollectionListCollection from "./types/blue/moji/collection/listCollection.js";
export * as BlueMojiCollectionPutItem from "./types/blue/moji/collection/putItem.js";
export * as BlueMojiCollectionSaveToCollection from "./types/blue/moji/collection/saveToCollection.js";
export * as BlueMojiEmbedSticker from "./types/blue/moji/embed/sticker.js";
export * as BlueMojiPacksDefs from "./types/blue/moji/packs/defs.js";
export * as BlueMojiPacksGetActorPacks from "./types/blue/moji/packs/getActorPacks.js";
export * as BlueMojiPacksGetPack from "./types/blue/moji/packs/getPack.js";
export * as BlueMojiPacksGetPacks from "./types/blue/moji/packs/getPacks.js";
export * as BlueMojiPacksPack from "./types/blue/moji/packs/pack.js";
export * as BlueMojiPacksPackitem from "./types/blue/moji/packs/packitem.js";
export * as BlueMojiRichtextFacet from "./types/blue/moji/richtext/facet.js";
export * as ComAtprotoLabelDefs from "./types/com/atproto/label/defs.js";
export * as ComAtprotoModerationDefs from "./types/com/atproto/moderation/defs.js";
export * as ComAtprotoRepoStrongRef from "./types/com/atproto/repo/strongRef.js";

export const APP_BSKY_FEED = {
  DefsRequestLess: "app.bsky.feed.defs#requestLess",
  DefsRequestMore: "app.bsky.feed.defs#requestMore",
  DefsInteractionLike: "app.bsky.feed.defs#interactionLike",
  DefsInteractionSeen: "app.bsky.feed.defs#interactionSeen",
  DefsClickthroughItem: "app.bsky.feed.defs#clickthroughItem",
  DefsContentModeVideo: "app.bsky.feed.defs#contentModeVideo",
  DefsInteractionQuote: "app.bsky.feed.defs#interactionQuote",
  DefsInteractionReply: "app.bsky.feed.defs#interactionReply",
  DefsInteractionShare: "app.bsky.feed.defs#interactionShare",
  DefsClickthroughEmbed: "app.bsky.feed.defs#clickthroughEmbed",
  DefsInteractionRepost: "app.bsky.feed.defs#interactionRepost",
  DefsClickthroughAuthor: "app.bsky.feed.defs#clickthroughAuthor",
  DefsClickthroughReposter: "app.bsky.feed.defs#clickthroughReposter",
  DefsContentModeUnspecified: "app.bsky.feed.defs#contentModeUnspecified",
};
export const APP_BSKY_GRAPH = {
  DefsModlist: "app.bsky.graph.defs#modlist",
  DefsCuratelist: "app.bsky.graph.defs#curatelist",
  DefsReferencelist: "app.bsky.graph.defs#referencelist",
};
export const COM_ATPROTO_MODERATION = {
  DefsReasonSpam: "com.atproto.moderation.defs#reasonSpam",
  DefsReasonViolation: "com.atproto.moderation.defs#reasonViolation",
  DefsReasonMisleading: "com.atproto.moderation.defs#reasonMisleading",
  DefsReasonSexual: "com.atproto.moderation.defs#reasonSexual",
  DefsReasonRude: "com.atproto.moderation.defs#reasonRude",
  DefsReasonOther: "com.atproto.moderation.defs#reasonOther",
  DefsReasonAppeal: "com.atproto.moderation.defs#reasonAppeal",
};

export class AtpBaseClient extends XrpcClient {
  app: AppNS;
  blue: BlueNS;
  com: ComNS;

  constructor(options: FetchHandler | FetchHandlerOptions) {
    super(options, schemas);
    this.app = new AppNS(this);
    this.blue = new BlueNS(this);
    this.com = new ComNS(this);
  }

  /** @deprecated use `this` instead */
  get xrpc(): XrpcClient {
    return this;
  }
}

export class AppNS {
  _client: XrpcClient;
  bsky: AppBskyNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.bsky = new AppBskyNS(client);
  }
}

export class AppBskyNS {
  _client: XrpcClient;
  embed: AppBskyEmbedNS;
  feed: AppBskyFeedNS;
  richtext: AppBskyRichtextNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.embed = new AppBskyEmbedNS(client);
    this.feed = new AppBskyFeedNS(client);
    this.richtext = new AppBskyRichtextNS(client);
  }
}

export class AppBskyEmbedNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }
}

export class AppBskyFeedNS {
  _client: XrpcClient;
  postgate: AppBskyFeedPostgateRecord;
  threadgate: AppBskyFeedThreadgateRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.postgate = new AppBskyFeedPostgateRecord(client);
    this.threadgate = new AppBskyFeedThreadgateRecord(client);
  }
}

export class AppBskyFeedPostgateRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">): Promise<{
    cursor?: string;
    records: { uri: string; value: AppBskyFeedPostgate.Record }[];
  }> {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.feed.postgate",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyFeedPostgate.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.feed.postgate",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<AppBskyFeedPostgate.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.postgate";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<AppBskyFeedPostgate.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.postgate";
    const res = await this._client.call(
      "com.atproto.repo.putRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      "com.atproto.repo.deleteRecord",
      undefined,
      { collection: "app.bsky.feed.postgate", ...params },
      { headers },
    );
  }
}

export class AppBskyFeedThreadgateRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">): Promise<{
    cursor?: string;
    records: { uri: string; value: AppBskyFeedThreadgate.Record }[];
  }> {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.feed.threadgate",
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">): Promise<{
    uri: string;
    cid: string;
    value: AppBskyFeedThreadgate.Record;
  }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.feed.threadgate",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<AppBskyFeedThreadgate.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.threadgate";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<AppBskyFeedThreadgate.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.threadgate";
    const res = await this._client.call(
      "com.atproto.repo.putRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      "com.atproto.repo.deleteRecord",
      undefined,
      { collection: "app.bsky.feed.threadgate", ...params },
      { headers },
    );
  }
}

export class AppBskyRichtextNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }
}

export class BlueNS {
  _client: XrpcClient;
  moji: BlueMojiNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.moji = new BlueMojiNS(client);
  }
}

export class BlueMojiNS {
  _client: XrpcClient;
  collection: BlueMojiCollectionNS;
  embed: BlueMojiEmbedNS;
  packs: BlueMojiPacksNS;
  richtext: BlueMojiRichtextNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.collection = new BlueMojiCollectionNS(client);
    this.embed = new BlueMojiEmbedNS(client);
    this.packs = new BlueMojiPacksNS(client);
    this.richtext = new BlueMojiRichtextNS(client);
  }
}

export class BlueMojiCollectionNS {
  _client: XrpcClient;
  item: BlueMojiCollectionItemRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.item = new BlueMojiCollectionItemRecord(client);
  }

  getItem(
    params?: BlueMojiCollectionGetItem.QueryParams,
    opts?: BlueMojiCollectionGetItem.CallOptions,
  ): Promise<BlueMojiCollectionGetItem.Response> {
    return this._client.call("blue.moji.collection.getItem", params, undefined, opts);
  }

  listCollection(
    params?: BlueMojiCollectionListCollection.QueryParams,
    opts?: BlueMojiCollectionListCollection.CallOptions,
  ): Promise<BlueMojiCollectionListCollection.Response> {
    return this._client.call("blue.moji.collection.listCollection", params, undefined, opts);
  }

  putItem(
    data?: BlueMojiCollectionPutItem.InputSchema,
    opts?: BlueMojiCollectionPutItem.CallOptions,
  ): Promise<BlueMojiCollectionPutItem.Response> {
    return this._client.call("blue.moji.collection.putItem", opts?.qp, data, opts);
  }

  saveToCollection(
    data?: BlueMojiCollectionSaveToCollection.InputSchema,
    opts?: BlueMojiCollectionSaveToCollection.CallOptions,
  ): Promise<BlueMojiCollectionSaveToCollection.Response> {
    return this._client
      .call("blue.moji.collection.saveToCollection", opts?.qp, data, opts)
      .catch((e) => {
        throw BlueMojiCollectionSaveToCollection.toKnownErr(e);
      });
  }
}

export class BlueMojiCollectionItemRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">): Promise<{
    cursor?: string;
    records: { uri: string; value: BlueMojiCollectionItem.Record }[];
  }> {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "blue.moji.collection.item",
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">): Promise<{
    uri: string;
    cid: string;
    value: BlueMojiCollectionItem.Record;
  }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "blue.moji.collection.item",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<BlueMojiCollectionItem.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "blue.moji.collection.item";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<BlueMojiCollectionItem.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "blue.moji.collection.item";
    const res = await this._client.call(
      "com.atproto.repo.putRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      "com.atproto.repo.deleteRecord",
      undefined,
      { collection: "blue.moji.collection.item", ...params },
      { headers },
    );
  }
}

export class BlueMojiEmbedNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }
}

export class BlueMojiPacksNS {
  _client: XrpcClient;
  pack: BlueMojiPacksPackRecord;
  packitem: BlueMojiPacksPackitemRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.pack = new BlueMojiPacksPackRecord(client);
    this.packitem = new BlueMojiPacksPackitemRecord(client);
  }

  getActorPacks(
    params?: BlueMojiPacksGetActorPacks.QueryParams,
    opts?: BlueMojiPacksGetActorPacks.CallOptions,
  ): Promise<BlueMojiPacksGetActorPacks.Response> {
    return this._client.call("blue.moji.packs.getActorPacks", params, undefined, opts);
  }

  getPack(
    params?: BlueMojiPacksGetPack.QueryParams,
    opts?: BlueMojiPacksGetPack.CallOptions,
  ): Promise<BlueMojiPacksGetPack.Response> {
    return this._client.call("blue.moji.packs.getPack", params, undefined, opts);
  }

  getPacks(
    params?: BlueMojiPacksGetPacks.QueryParams,
    opts?: BlueMojiPacksGetPacks.CallOptions,
  ): Promise<BlueMojiPacksGetPacks.Response> {
    return this._client.call("blue.moji.packs.getPacks", params, undefined, opts);
  }
}

export class BlueMojiPacksPackRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">): Promise<{
    cursor?: string;
    records: { uri: string; value: BlueMojiPacksPack.Record }[];
  }> {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "blue.moji.packs.pack",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: BlueMojiPacksPack.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "blue.moji.packs.pack",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<BlueMojiPacksPack.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "blue.moji.packs.pack";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<BlueMojiPacksPack.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "blue.moji.packs.pack";
    const res = await this._client.call(
      "com.atproto.repo.putRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      "com.atproto.repo.deleteRecord",
      undefined,
      { collection: "blue.moji.packs.pack", ...params },
      { headers },
    );
  }
}

export class BlueMojiPacksPackitemRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">): Promise<{
    cursor?: string;
    records: { uri: string; value: BlueMojiPacksPackitem.Record }[];
  }> {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "blue.moji.packs.packitem",
      ...params,
    });
    return res.data;
  }

  async get(params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">): Promise<{
    uri: string;
    cid: string;
    value: BlueMojiPacksPackitem.Record;
  }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "blue.moji.packs.packitem",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<ComAtprotoRepoCreateRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<BlueMojiPacksPackitem.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "blue.moji.packs.packitem";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async put(
    params: OmitKey<ComAtprotoRepoPutRecord.InputSchema, "collection" | "record">,
    record: Un$Typed<BlueMojiPacksPackitem.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "blue.moji.packs.packitem";
    const res = await this._client.call(
      "com.atproto.repo.putRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      "com.atproto.repo.deleteRecord",
      undefined,
      { collection: "blue.moji.packs.packitem", ...params },
      { headers },
    );
  }
}

export class BlueMojiRichtextNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }
}

export class ComNS {
  _client: XrpcClient;
  atproto: ComAtprotoNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.atproto = new ComAtprotoNS(client);
  }
}

export class ComAtprotoNS {
  _client: XrpcClient;
  repo: ComAtprotoRepoNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.repo = new ComAtprotoRepoNS(client);
  }
}

export class ComAtprotoRepoNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }
}
