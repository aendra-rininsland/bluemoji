import {
  pipeline,
  env,
  ImageClassificationSingle,
  ImageClassificationOutput,
} from "@xenova/transformers";

env.backends.onnx.wasm.numThreads = 1;
env.allowRemoteModels = false;
env.localModelPath = "../transformers.js/models";
// console.log(env);

export const MODEL_NAME_LARGE = "xblock-large-patch3-224";
export const MODEL_NAME = MODEL_NAME_LARGE;

const p = pipeline("image-classification", `howdyaendra/${MODEL_NAME_LARGE}`);

export const classify = async (
  url: string
): Promise<ImageClassificationSingle[]> => {
  const classifier = await p;
  const result = (await classifier(url, {
    topk: 4,
  })) as ImageClassificationOutput;

  return result;
};
