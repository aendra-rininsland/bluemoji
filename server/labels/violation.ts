import { defineLabel } from "$hatk";

export default defineLabel({
  definition: {
    identifier: "violation",
    severity: "alert",
    blurs: "content",
    defaultSetting: "warn",
    locales: [
      {
        lang: "en",
        name: "Server rule violation",
        description: "Direct violation of server rules, laws, or terms of service.",
      },
    ],
  },
});
