// Generate the moderation labeler's signing key. Run this on your own machine:
//   node scripts/labeler-keygen.mjs
// Put the private key in Railway as LABELER_SIGNING_KEY (never commit it), and
// publish the did:key in the labeler account's DID document as `#atproto_label`.
import { Secp256k1Keypair } from "@atproto/crypto";

const keypair = await Secp256k1Keypair.create({ exportable: true });
const privateHex = Buffer.from(await keypair.export()).toString("hex");
const didKey = keypair.did();

console.log(`
LABELER_SIGNING_KEY=${privateHex}
    ^ secret. Set it as a Railway variable; do not commit it or paste it anywhere else.

Public key, for the labeler's DID document (verificationMethods → atproto_label):
  ${didKey}
  publicKeyMultibase: ${didKey.slice("did:key:".length)}
`);
