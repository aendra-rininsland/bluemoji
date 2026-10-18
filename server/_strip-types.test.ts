// Production runs `node --experimental-strip-types`, which rejects TypeScript that
// needs transforming (parameter properties, enums, namespaces). hatk loads
// everything under server/, plus whatever those files import, so a single such
// construct crashes the app at boot, and the deploy's health check fails.
// `hatk start` and tsx accept it, so nothing else catches this before Railway.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}

const entries = walk(join(root, "server")).filter((f) => !f.endsWith(".test.ts"));
const seen = new Set<string>();
const problems: string[] = [];
const queue = [...entries];
while (queue.length) {
  const file = queue.pop()!;
  if (seen.has(file)) continue;
  seen.add(file);
  const code = readFileSync(file, "utf8");
  try {
    stripTypeScriptTypes(code, { mode: "strip" });
  } catch (e) {
    problems.push(`${file.slice(root.length + 1)}: ${(e as Error).message.split("\n")[0]}`);
  }
  for (const m of code.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const target = resolve(dirname(file), m[1]);
    if (target.endsWith(".ts")) {
      try {
        if (statSync(target).isFile()) queue.push(target);
      } catch {
        /* an import that doesn't resolve is not this test's concern */
      }
    }
  }
}

assert.ok(seen.size > 20, `scanned ${seen.size} files`);
assert.deepEqual(
  problems,
  [],
  `unsupported under --experimental-strip-types:\n${problems.join("\n")}`,
);
console.log(`ok - ${seen.size} files loaded by hatk are valid under --experimental-strip-types`);
