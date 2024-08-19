import { JoseKey } from "@atproto/jwk-jose"; // NodeJS/Browser only
import fs from "fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
  const keys = await Promise.all(
    Array(3)
      .fill(null)
      .map(async () => {
        const { publicKey, privateKey } = await JoseKey.generateKeyPair(
          ["ES256"],
          {
            extractable: true,
          }
        );
        const privateJwk = await JoseKey.exportJWK(privateKey);
        const publicJwk = await JoseKey.exportJWK(publicKey);
      })
  );
  await fs.writeFile(`${__dirname}/../keys.json`, JSON.stringify(keys));
})();
