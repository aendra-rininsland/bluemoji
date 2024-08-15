import * as BlueMojiCollectionItem from "@aendra/lexicons/types/blue/moji/collection/item";

interface RenderApngParams {
  width: 128;
  height: 128;
}

export const renderApngAsImg = (
  bytes: Uint8Array,
  params: RenderApngParams = {
    width: 128,
    height: 128
  }
) => {
  try {
    const img = document.createElement("img");
    img.width = params.width;
    img.height = params.height;

    const blob = new Blob([bytes], { type: "image/png" });
    img.src = URL.createObjectURL(blob);

    return img;
  } catch (e) {
    console.error(e);
  }
};
