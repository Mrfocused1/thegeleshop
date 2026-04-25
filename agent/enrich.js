#!/usr/bin/env node
// Batch-fetch full Instagram post data (incl. carousel children) for one or
// more URLs in a SINGLE Apify run. Downloads cover images to posts/images/<shortcode>.jpg
// and writes metadata to posts/images/<shortcode>.json.
//
// Why batch: each Apify run has 30–60s of container-startup overhead. 10 posts
// in one run ≈ 1× that overhead. 10 separate runs ≈ 10× the wall-clock time.
// Per-result $-cost is the same (~$0.0026 each).
//
// Usage:
//   node enrich.js <url1> [<url2> ...]
//   node enrich.js --queue              # enrich every queued URL that's not yet enriched

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApifyClient } from "apify-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUEUE = path.join(__dirname, "queue.json");
const IMAGES_DIR = path.join(__dirname, "..", "posts", "images");

let urls = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const fromQueue = process.argv.includes("--queue");

if (fromQueue) {
  const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
  // Anything queued but not yet enriched (no hero_image)
  urls = queue
    .filter((q) => q.ig_url && !q.ig_url.includes("PASTE_REAL") && !q.hero_image)
    .map((q) => q.ig_url);
  if (!urls.length) {
    console.log("Nothing to enrich — every queued post already has a hero image.");
    process.exit(0);
  }
}

if (!urls.length) {
  console.error("Usage: node enrich.js <url1> [<url2> ...]   |   node enrich.js --queue");
  process.exit(1);
}

const TOKEN = process.env.APIFY_API_TOKEN;
if (!TOKEN) { console.error("APIFY_API_TOKEN missing in agent/.env"); process.exit(1); }

console.log(`Batch-fetching ${urls.length} URL(s) in one Apify run…`);

const client = new ApifyClient({ token: TOKEN });
const run = await client.actor("apify/instagram-scraper").call({
  directUrls: urls,
  resultsType: "posts",
  resultsLimit: urls.length,
});
const { items: posts } = await client.dataset(run.defaultDatasetId).listItems();
console.log(`Apify returned ${posts.length} post(s). Downloading covers…\n`);

fs.mkdirSync(IMAGES_DIR, { recursive: true });

const results = [];
for (const post of posts) {
  const shortcode = post.shortCode || post.url?.match(/\/p\/([^\/]+)/)?.[1];
  if (!shortcode) { console.warn(`  ⚠ no shortcode for ${post.url}`); continue; }

  const coverUrl = post.displayUrl || post.childPosts?.[0]?.displayUrl;
  if (!coverUrl) { console.warn(`  ⚠ no displayUrl for ${shortcode}`); continue; }

  // Download cover image
  const ext = coverUrl.match(/\.(jpe?g|png|webp)/i)?.[1] || "jpg";
  const filename = `${shortcode}.${ext}`;
  const localPath = path.join(IMAGES_DIR, filename);

  try {
    const res = await fetch(coverUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localPath, buf);
    fs.writeFileSync(path.join(IMAGES_DIR, `${shortcode}.json`), JSON.stringify(post, null, 2));

    const childCount = post.childPosts?.length || 0;
    console.log(`  ✓ ${shortcode}  ${(buf.length / 1024).toFixed(0)} KB${childCount ? `  (${childCount} carousel slides)` : ""}`);
    results.push({ url: post.url, shortcode, hero_image: `posts/images/${filename}` });
  } catch (e) {
    console.error(`  ✗ ${shortcode}  ${e.message}`);
  }
}

// If --queue, splice hero_image back into queue.json so agent.js picks it up.
if (fromQueue) {
  const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
  for (const r of results) {
    const entry = queue.find((q) => q.ig_url === r.url);
    if (entry) entry.hero_image = r.hero_image;
  }
  fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + "\n");
  console.log(`\nUpdated queue.json with hero_image paths for ${results.length} post(s).`);
}

console.log(`\nDone. Saved ${results.length} cover image(s) to posts/images/.`);
