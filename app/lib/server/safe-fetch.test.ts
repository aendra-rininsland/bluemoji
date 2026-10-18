import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { guardedConnectLookup, pinnedFetch } from "./safe-fetch.ts";

type Addr = { address: string; family: number };
const fakeLookup = (addrs: Addr[], err: Error | null = null) =>
  ((_h: string, _o: unknown, cb: (e: Error | null, a?: unknown) => void) =>
    err ? cb(err) : cb(null, addrs)) as never;
const run = (lookup: ReturnType<typeof guardedConnectLookup>, all: boolean) =>
  new Promise<{ err: Error | null; address?: unknown; family?: number }>((resolve) =>
    lookup("x.example", { all } as never, (err, address, family) =>
      resolve({ err, address, family }),
    ),
  );

// -- the connect-time lookup: the addresses it hands back are the ones used
{
  const pub = guardedConnectLookup(fakeLookup([{ address: "93.184.216.34", family: 4 }]));
  const one = await run(pub, false);
  assert.equal(one.err, null);
  assert.equal(one.address, "93.184.216.34");
  assert.equal(one.family, 4);
  const all = await run(pub, true);
  assert.deepEqual(all.address, [{ address: "93.184.216.34", family: 4 }]);

  for (const bad of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fd00::1"]) {
    const r = await run(
      guardedConnectLookup(fakeLookup([{ address: bad, family: bad.includes(":") ? 6 : 4 }])),
      false,
    );
    assert.match(String(r.err?.message), /Address not allowed/, bad);
  }
  const mixed = await run(
    guardedConnectLookup(
      fakeLookup([
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]),
    ),
    true,
  );
  assert.ok(mixed.err, "one private answer refuses the lot");
  const failed = await run(guardedConnectLookup(fakeLookup([], new Error("ENOTFOUND"))), false);
  assert.match(String(failed.err?.message), /ENOTFOUND/);
}
console.log("ok - the connect-time lookup refuses private answers and passes public ones through");

// -- end to end: a name that resolves to loopback never reaches the server,
//    even though nothing checked it beforehand (the rebinding case)
{
  let hits = 0;
  const server = createServer((_req, res) => {
    hits++;
    res.end("secret");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  try {
    // control: the plain global fetch would reach it
    const control = await fetch(`http://localhost:${port}/`)
      .then((r) => r.text())
      .catch(() => null);
    const reachable = control === "secret";
    hits = 0;
    await assert.rejects(pinnedFetch()(`http://localhost:${port}/`, {}));
    assert.equal(hits, 0, "the pinned fetch never connected");
    console.log(
      `ok - a hostname that resolves to loopback is refused at connect time${reachable ? "" : " (control could not reach localhost; guard result still holds)"}`,
    );
  } finally {
    server.close();
  }
}

console.log("safe-fetch tests passed");
