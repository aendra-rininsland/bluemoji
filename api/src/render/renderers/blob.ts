import * as BlueMojiCollectionItem from "../../client/types/blue/moji/collection/item";

interface RenderBlobParams {
  width: 128;
  height: 128;
  cdnBase: string;
}

export enum BlobTypeEnum {
  PNG = "png",
  GIF = "gif",
  WEBP = "webp"
}

type BlobInfo = {
  did: string;
  record?: BlueMojiCollectionItem.Record;
  cid?: string;
};

export const renderBlobAsImg = (
  item: BlobInfo,
  type: BlobTypeEnum,
  params: RenderBlobParams = {
    width: 128,
    height: 128,
    cdnBase: "https://cdn.bsky.app/img/avatar_thumbnail/plain/"
  }
) => {
  try {
    if (!Object.values(BlobTypeEnum).includes(type)) {
      throw new Error("Invalid blob format type");
    }

    const { record, did, cid } = item;
    const img = document.createElement("img");
    img.width = params.width;
    img.height = params.height;
    if (record) {
      if (BlueMojiCollectionItem.isFormats_v0(record.formats)) {
        const format = record.formats[
          `${type}_${params.width}`
        ] as BlueMojiCollectionItem.Blob_v0;
        img.src = `${params.cdnBase}/${did}/${format.ref}@${type}`;
      } else {
        throw new Error("Invalid record");
      }
    } else if (cid) {
      img.src = `${params.cdnBase}/${did}/${cid}@${type}`;
    } else {
      throw new Error("Invalid blob info");
    }

    return img;
  } catch (e) {
    console.error(e);
  }
};
