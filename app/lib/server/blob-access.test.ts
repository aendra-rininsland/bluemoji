import assert from "node:assert/strict";
import {
  blobIsIndexed,
  clearBlobAccessCache,
  imgAuthorizeEnabled,
  makeAuthorizer,
} from "./blob-access.ts";

const DID = "did:plc:abcdefghijklmnopqrstuvwx";
const CID = "bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function fetchOf(answer: () => Response) {
  const urls: string[] = [];
  const f = (async (input: any) => {
    urls.push(String(input));
    return answer();
  }) as typeof fetch;
  return { f, urls };
}
const yes = () => new Response(JSON.stringify({ available: true }));
const no = () => new Response(JSON.stringify({ available: false }));

{
  const { f, urls } = fetchOf(yes);
  assert.equal(await blobIsIndexed(f, DID, CID), true);
  assert.equal(
    urls[0],
    `/xrpc/blue.moji.collection.checkBlob?did=${encodeURIComponent(DID)}&cid=${CID}`,
  );
  await blobIsIndexed(f, DID, CID);
  assert.equal(urls.length, 1, "a yes is remembered briefly");
}
console.log("ok - asks checkBlob and remembers a yes");

{
  clearBlobAccessCache();
  const { f, urls } = fetchOf(no);
  assert.equal(await blobIsIndexed(f, DID, CID), false);
  await blobIsIndexed(f, DID, CID);
  assert.equal(
    urls.length,
    2,
    "a no is never remembered (the record may be indexed a moment later)",
  );
}
console.log("ok - a no is not cached");

{
  clearBlobAccessCache();
  for (const bad of [
    () => new Response("x", { status: 500 }),
    () => new Response("{}"),
    () => new Response("not json"),
  ]) {
    await assert.rejects(blobIsIndexed(fetchOf(bad).f, DID, CID));
  }
  await assert.rejects(
    blobIsIndexed(
      (async () => {
        throw new Error("down");
      }) as typeof fetch,
      DID,
      CID,
    ),
  );
}
console.log("ok - an unanswerable check throws instead of guessing");

{
  clearBlobAccessCache();
  let looked = 0;
  const viewer = (did: string | null) => async () => (looked++, did);
  const auth = (answer: () => Response, v: ReturnType<typeof viewer>) =>
    makeAuthorizer({ fetch: fetchOf(answer).f, viewerDid: v });

  assert.equal(await auth(yes, viewer(null))(DID, CID), true);
  assert.equal(looked, 0, "the viewer isn't looked up when the blob is indexed");

  clearBlobAccessCache();
  assert.equal(
    await auth(no, viewer(DID))(DID, CID),
    "private",
    "an owner sees their own unindexed blob, privately",
  );
  assert.equal(
    await auth(no, viewer("did:plc:zzzzzzzzzzzzzzzzzzzzzzzz"))(DID, CID),
    false,
    "someone else does not",
  );
  assert.equal(await auth(no, viewer(null))(DID, CID), false, "nor does a signed-out visitor");
}
console.log("ok - indexed blobs are public; unindexed ones only reach their owner, privately");

assert.equal(imgAuthorizeEnabled({}), true);
assert.equal(imgAuthorizeEnabled({ IMG_AUTHORIZE: "off" }), false);
assert.equal(imgAuthorizeEnabled({ IMG_AUTHORIZE: "OFF" }), false);
assert.equal(imgAuthorizeEnabled({ IMG_AUTHORIZE: "on" }), true);
console.log("ok - IMG_AUTHORIZE=off disables the check");
console.log("blob access tests passed");
