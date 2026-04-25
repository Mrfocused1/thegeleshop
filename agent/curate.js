#!/usr/bin/env node
// Interactive terminal curation: walk through candidates.json, pick which to
// publish. Each [q]ueued candidate is appended to queue.json with the theme
// hint you provide; the daily agent.js then drafts the post.

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATES = path.join(__dirname, "candidates.json");
const QUEUE = path.join(__dirname, "queue.json");

if (!fs.existsSync(CANDIDATES)) {
  console.error("candidates.json not found — run `node discover.js` first.");
  process.exit(1);
}

const candidates = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
let queuedCount = 0;

if (!candidates.length) {
  console.log("No candidates. Either nothing new today, or everything is already queued.");
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, (ans) => res(ans.trim())));

const remaining = candidates.slice();
console.log(`\n${candidates.length} candidates to review.\n`);
console.log("Commands: [q]ueue · [s]kip · [t]heme then queue · e[x]it\n");

for (let i = 0; i < remaining.length; i++) {
  const c = remaining[i];
  console.log("─".repeat(72));
  console.log(`[${i + 1}/${remaining.length}]  ${c.photographer}  ·  ${c.posted_at}` + (c.likes ? `  ·  ${c.likes.toLocaleString()} ❤` : ""));
  console.log(`URL:       ${c.ig_url}`);
  if (c.thumbnail) console.log(`Thumbnail: ${c.thumbnail}`);
  if (c.caption_excerpt) console.log(`Caption:   ${c.caption_excerpt.replace(/\n/g, " ")}${c.caption_excerpt.length >= 200 ? "…" : ""}`);
  console.log("");

  const action = (await ask("Action [q/s/t/x]: ")).toLowerCase();
  if (action === "x") break;
  if (action === "s" || action === "") { console.log("→ skipped\n"); continue; }

  let theme = "";
  if (action === "t") {
    theme = await ask("Theme hint (optional, helps the writer): ");
  }

  queue.push({
    ig_url: c.ig_url,
    photographer: c.photographer,
    theme,
    added_at: new Date().toISOString().slice(0, 10),
  });
  queuedCount++;
  console.log("→ queued ✓\n");
}

rl.close();

// Persist
fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + "\n");

// Drop processed candidates so re-running curate.js doesn't show them again
fs.writeFileSync(CANDIDATES, JSON.stringify([], null, 2) + "\n");

console.log("─".repeat(72));
console.log(`Queued: ${queuedCount}.  Total queue depth: ${queue.length}.`);
if (queuedCount > 0) {
  console.log(`\nNext: ANTHROPIC_API_KEY=... node agent.js  (drafts the next post)`);
}
