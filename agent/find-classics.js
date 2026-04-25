#!/usr/bin/env node
// Find "classic" Instagram posts — high-engagement, evergreen Nigerian wedding
// content from the watchlist. Pulls deeper history (default 30 posts/account),
// sorts by likes, applies a minimum-likes threshold, downloads cover images,
// writes classics_candidates.json for review.
//
// Usage:
//   node find-classics.js                # default: 30 posts/account, ≥5000 likes, ≥30 days old
//   node find-classics.js --min-likes 10000 --min-age-days 90 --per-account 50

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApifyClient } from "apify-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WATCHLIST = path.join(__dirname, "watchlist.json");
const QUEUE = path.join(__dirname, "queue.json");
const PUBLISHED = path.join(__dirname, "published.json");
const CLASSICS = path.join(__dirname, "classics_candidates.json");
const IMAGES_DIR = path.join(__dirname, "..", "posts", "images");

// ---- args ----
function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? def : process.argv[i + 1];
}
const PER_ACCOUNT = parseInt(arg("--per-account", "30"), 10);
const MIN_LIKES = parseInt(arg("--min-likes", "5000"), 10);
const MIN_AGE_DAYS = parseInt(arg("--min-age-days", "30"), 10);
const TOP_N = parseInt(arg("--top", "10"), 10);

const TOKEN = process.env.APIFY_API_TOKEN;
if (!TOKEN) { console.error("APIFY_API_TOKEN missing"); process.exit(1); }

const watchlist = JSON.parse(fs.readFileSync(WATCHLIST, "utf8"));
const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const published = JSON.parse(fs.readFileSync(PUBLISHED, "utf8"));
const seen = new Set([...queue.map((q) => q.ig_url), ...published.map((p) => p.ig_url)]);

const accounts = watchlist.accounts || [];
console.log(`Finding classics across ${accounts.length} accounts:`);
console.log(`  per-account: ${PER_ACCOUNT}  min-likes: ${MIN_LIKES.toLocaleString()}  min-age-days: ${MIN_AGE_DAYS}  top: ${TOP_N}`);
console.log(`  already-seen URLs: ${seen.size}\n`);

const profileUrls = accounts.map((u) => `https://www.instagram.com/${u}/`);

const client = new ApifyClient({ token: TOKEN });
const run = await client.actor("apify/instagram-scraper").call({
  directUrls: profileUrls,
  resultsType: "posts",
  resultsLimit: PER_ACCOUNT,
});
const { items: posts } = await client.dataset(run.defaultDatasetId).listItems();
console.log(`Apify returned ${posts.length} posts total. Filtering…`);

const cutoffMs = Date.now() - MIN_AGE_DAYS * 86_400_000;

const candidates = [];
for (const post of posts) {
  const username = post.ownerUsername;
  const url = post.url;
  const likes = post.likesCount || 0;
  const postedMs = post.timestamp ? new Date(post.timestamp).getTime() : 0;
  if (!username || !url) continue;
  if (likes < MIN_LIKES) continue;
  if (postedMs > cutoffMs) continue;             // too recent — not a classic
  if (seen.has(url)) continue;

  candidates.push({
    ig_url: url,
    photographer: `@${username}`,
    posted_at: new Date(postedMs).toISOString().slice(0, 10),
    type: post.type,
    likes,
    comments: post.commentsCount || 0,
    thumbnail: post.displayUrl,
    caption_excerpt: (post.caption || "").slice(0, 280),
    shortcode: post.shortCode,
    has_carousel: !!(post.childPosts && post.childPosts.length),
  });
}

candidates.sort((a, b) => b.likes - a.likes);
const top = candidates.slice(0, TOP_N);

console.log(`\nFound ${candidates.length} candidates above threshold. Top ${top.length}:\n`);
top.forEach((c, i) => {
  const ageDays = Math.floor((Date.now() - new Date(c.posted_at).getTime()) / 86_400_000);
  console.log(`[${i + 1}] ${c.likes.toLocaleString().padStart(7)} ❤  ${c.comments.toLocaleString().padStart(5)} 💬  ${c.posted_at}  (${ageDays}d)  ${c.photographer}`);
  console.log(`     ${c.ig_url}${c.has_carousel ? "  📷×" : "  📷"}`);
  const cap = (c.caption_excerpt || "").replace(/\n/g, " ").trim();
  if (cap) console.log(`     "${cap.slice(0, 130)}${cap.length > 130 ? "…" : ""}"`);
  console.log();
});

// Download cover images for the top N
fs.mkdirSync(IMAGES_DIR, { recursive: true });
console.log("Downloading covers for top candidates…");
for (const c of top) {
  if (!c.thumbnail || !c.shortcode) continue;
  const ext = c.thumbnail.match(/\.(jpe?g|png|webp)/i)?.[1] || "jpg";
  const local = path.join(IMAGES_DIR, `${c.shortcode}.${ext}`);
  if (fs.existsSync(local)) { c.hero_image = `posts/images/${c.shortcode}.${ext}`; continue; }
  try {
    const res = await fetch(c.thumbnail, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()));
    c.hero_image = `posts/images/${c.shortcode}.${ext}`;
    console.log(`  ✓ ${c.shortcode}.${ext}`);
  } catch (e) {
    console.warn(`  ✗ ${c.shortcode}: ${e.message}`);
  }
}

fs.writeFileSync(CLASSICS, JSON.stringify(top, null, 2) + "\n");
console.log(`\nWrote ${top.length} → classics_candidates.json. Review and queue with curate.js or pick directly.`);
