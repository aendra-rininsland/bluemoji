import { JoseKey } from "@atproto/jwk-jose"; // NodeJS/Browser only
import fs from "fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
  const keys = await Promise.all(
    Array(3)
      .fill(null)
      .map((_, i) => JoseKey.generate(["ES256"], `bluemoji.${i}`))
  );
  await fs.writeFile(`${__dirname}/../keys.json`, JSON.stringify(keys));
})();
