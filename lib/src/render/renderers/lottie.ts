import * as BlueMojiRichTextFacet from "@aendra/lexicons/types/blue/moji/richtext/facet";
import { DotLottie, Config } from "@lottiefiles/dotlottie-web";

interface RenderLottieParams extends Omit<Config, "canvas" | "src"> {
  width: 128;
  height: 128;
  player: boolean;
}

export const renderLottieAsCanvas = (
  bytes: Uint8Array,
  params: RenderLottieParams = {
    autoplay: true,
    loop: true,
    width: 128,
    height: 128,
    player: false
  }
) => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = params.width;
    canvas.height = params.height;

    const blob = new Blob([bytes], { type: "application/lottie+zip" });
    const src = URL.createObjectURL(blob);
    const player = new DotLottie({
      ...params,
      canvas,
      src
    });

    return params.player ? { canvas, player } : canvas;
  } catch (e) {
    console.error(e);
  }
};
