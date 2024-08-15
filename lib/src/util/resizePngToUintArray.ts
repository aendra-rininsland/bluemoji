import UPNG from "upng-js";

export async function resizePngToUintArray(
  arrayBuffer: ArrayBuffer,
  size: number
) {
  const img = UPNG.decode(arrayBuffer);
  const rgba = UPNG.toRGBA8(img);
  const resized = await Promise.all(
    rgba.map(async (buf) => {
      const imageData = new ImageData(
        new Uint8ClampedArray(buf),
        img.width,
        img.height
      );
      const bitmap = await createImageBitmap(imageData, {
        resizeWidth: size,
        resizeHeight: size
        // resizeQuality: 'high', // this makes everything look worse for some reason
      });

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const { buffer } = ctx.getImageData(0, 0, size, size).data;
      return buffer;
    })
  );

  const apng = UPNG.encode(
    resized,
    size,
    size,
    img.depth,
    img.frames.map((f) => f.delay)
  );
  return new Uint8Array(apng);
}
