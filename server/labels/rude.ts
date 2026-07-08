import { defineLabel } from "$hatk";

export default defineLabel({
  definition: {
    identifier: "rude",
    severity: "inform",
    blurs: "none",
    defaultSetting: "warn",
    locales: [
      {
        lang: "en",
        name: "Rude or harassing",
        description: "Rude, harassing, or otherwise unwelcoming behavior.",
      },
    ],
  },
});
