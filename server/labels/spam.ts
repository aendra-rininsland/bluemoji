import { defineLabel } from "$hatk";

export default defineLabel({
  definition: {
    identifier: "spam",
    severity: "inform",
    blurs: "none",
    defaultSetting: "warn",
    locales: [
      {
        lang: "en",
        name: "Spam",
        description: "Frequent unwanted promotion, replies, or mentions.",
      },
    ],
  },
});
