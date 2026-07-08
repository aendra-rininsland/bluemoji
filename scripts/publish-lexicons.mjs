#!/usr/bin/env node
/**
 * Publish the blue.moji.* lexicons as com.atproto.lexicon.schema records
 * under the moji.blue account, per ROADMAP.md Phase 1 item 1 — this is what
 * makes them resolvable in lexicon browsers (pdsls, lexicon directory, etc).
 *
 * Only lexicons/blue/moji/** is published. The other lexicons/ subtrees
 * (app.bsky, com.atproto, dev.hatk) are vendored or framework-internal — we
 * don't own those namespaces and shouldn't publish schema records for them.
 *
 * Idempotent: uses putRecord (not createRecord), so re-running after editing
 * a lexicon updates its existing schema record. Safe to run repeatedly.
 *
 * Usage:
 *   BLUEMOJI_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx node scripts/publish-lexicons.mjs
 *   BLUEMOJI_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx node scripts/publish-lexicons.mjs --dry-run
 *
 * Env vars:
 *   BLUEMOJI_HANDLE        defaults to "moji.blue"
 *   BLUEMOJI_APP_PASSWORD  required (an app password for that account, not
 *                          the main account password — create one at
 *                          https://bsky.app/settings/app-passwords)
 *   BLUEMOJI_PDS_SERVICE   defaults to "https://bsky.social"; override if
 *                          the account is hosted on a different PDS
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AtpAgent } from "@atproto/api";

const DRY_RUN = process.argv.includes("--dry-run");

const HANDLE = process.env.BLUEMOJI_HANDLE || "moji.blue";
const APP_PASSWORD = process.env.BLUEMOJI_APP_PASSWORD;
const SERVICE = process.env.BLUEMOJI_PDS_SERVICE || "https://bsky.social";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEXICON_DIR = join(REPO_ROOT, "lexicons", "blue", "moji");

function findLexiconFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findLexiconFiles(full));
    } else if (entry.endsWith(".json")) {
      files.push(full);
    }
  }
  return files.sort();
}

function loadLexicons() {
  const files = findLexiconFiles(LEXICON_DIR);
  return files.map((path) => {
    const json = JSON.parse(readFileSync(path, "utf8"));
    if (!json.id || !json.lexicon || !json.defs) {
      throw new Error(`${path}: missing required lexicon fields (id/lexicon/defs)`);
    }
    return { path, nsid: json.id, doc: json };
  });
}

async function main() {
  const lexicons = loadLexicons();
  console.log(`Found ${lexicons.length} lexicons under lexicons/blue/moji/:`);
  for (const { nsid, path } of lexicons) {
    console.log(`  ${nsid}  (${path.slice(REPO_ROOT.length + 1)})`);
  }
  console.log();

  if (DRY_RUN) {
    console.log("--dry-run: not logging in or writing anything.");
    return;
  }

  if (!APP_PASSWORD) {
    console.error("BLUEMOJI_APP_PASSWORD is required (and not the main account password —");
    console.error("create an app password at https://bsky.app/settings/app-passwords).");
    process.exit(1);
  }

  const agent = new AtpAgent({ service: SERVICE });
  await agent.login({ identifier: HANDLE, password: APP_PASSWORD });
  const did = agent.session?.did;
  if (!did) throw new Error("Login succeeded but no DID on session — unexpected.");
  console.log(`Logged in as ${HANDLE} (${did}) via ${SERVICE}\n`);

  const results = { ok: [], failed: [] };

  for (const { nsid, doc } of lexicons) {
    try {
      await agent.com.atproto.repo.putRecord({
        repo: did,
        collection: "com.atproto.lexicon.schema",
        rkey: nsid,
        record: { $type: "com.atproto.lexicon.schema", ...doc },
      });
      console.log(`✓ published ${nsid}`);
      results.ok.push(nsid);
    } catch (err) {
      console.error(`✗ failed ${nsid}: ${err.message}`);
      results.failed.push(nsid);
    }
  }

  console.log(`\n${results.ok.length} published, ${results.failed.length} failed.`);
  if (results.failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
