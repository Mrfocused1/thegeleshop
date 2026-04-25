#!/usr/bin/env node
// Queue an Instagram post URL for the daily agent.
//
// Usage:
//   node add.js <ig-url> --photographer @handle --theme "your topic hint"

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE = path.join(__dirname, "queue.json");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--photographer" || a === "-p") args.photographer = argv[++i];
    else if (a === "--theme" || a === "-t") args.theme = argv[++i];
    else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const url = args._[0];

if (!url) {
  console.error("Usage: node add.js <ig-url> --photographer @handle --theme \"topic hint\"");
  process.exit(1);
}
if (!/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\//.test(url)) {
  console.error("Error: that doesn't look like a public Instagram post URL.");
  process.exit(1);
}

const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const entry = {
  ig_url: url,
  photographer: args.photographer || "",
  theme: args.theme || "",
  added_at: new Date().toISOString().slice(0, 10),
};
queue.push(entry);
fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + "\n");

console.log(`Queued (#${queue.length}):`);
console.log(`  ${entry.ig_url}`);
console.log(`  photographer: ${entry.photographer || "—"}`);
console.log(`  theme: ${entry.theme || "—"}`);
