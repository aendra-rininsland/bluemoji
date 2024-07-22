export const DevAendraBskyBluemoji = {
  lexicon: 1 as 1,
  id: "dev.aendra.bsky.bluemoji",
  defs: {
    main: {
      name: { type: "string" },
      alt: { type: "string" },
      createdAt: { type: "string", format: "datetime" },
      images: {
        type: "object",
        required: ["original"],
        properties: {
          original: {
            type: "blob",
          },
        },
      },
    },
  },
};

export interface OutputSchema {
  did: string;
  name: string;
}
