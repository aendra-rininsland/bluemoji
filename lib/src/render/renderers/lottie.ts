import { DotLottie, Config } from "@lottiefiles/dotlottie-web";

interface RenderLottieParams extends Omit<Config, "canvas" | "src"> {
  width: 128;
  height: 128;
  player: boolean;
  raw: boolean;
}

export const renderLottieAsCanvas = (
  bytes: { $bytes: Uint8Array },
  params: RenderLottieParams = {
    autoplay: true,
    loop: true,
    width: 128,
    height: 128,
    player: false,
    raw: false
  }
) => {
  if (params.raw && bytes) return bytes; // noop if bytes are requested for e.g. React Native
  try {
    const canvas = document.createElement("canvas");
    canvas.width = params.width;
    canvas.height = params.height;

    const player = new DotLottie({
      ...params,
      canvas,
      data: bytes
    });

    return params.player ? { canvas, player } : canvas;
  } catch (e) {
    console.error(e);
  }
};
