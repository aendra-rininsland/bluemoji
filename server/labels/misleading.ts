import { defineLabel } from "$hatk";

export default defineLabel({
  definition: {
    identifier: "misleading",
    severity: "inform",
    blurs: "none",
    defaultSetting: "warn",
    locales: [
      {
        lang: "en",
        name: "Misleading",
        description: "Misleading identity, affiliation, or content.",
      },
    ],
  },
});
