import { defineLabel } from "$hatk";

export default defineLabel({
  definition: {
    identifier: "sexual",
    severity: "alert",
    blurs: "media",
    defaultSetting: "warn",
    locales: [
      {
        lang: "en",
        name: "Sexual content",
        description: "Unwanted or mislabeled sexual content.",
      },
    ],
  },
});
