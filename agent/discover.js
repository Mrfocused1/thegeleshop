#!/usr/bin/env node
// Daily discovery: fetch latest posts from the watchlist via Apify,
// dedupe against state/queue/published, write candidates.json for curation.
//
// Cost: ~$0.50 per 1000 posts via apidojo/instagram-scraper-api.
// At default scale (5 accounts × 5 posts) ≈ $0.013 per run.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ApifyClient } from "apify-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WATCHLIST = path.join(__dirname, "watchlist.json");
const STATE = path.join(__dirname, "_state.json");
const QUEUE = path.join(__dirname, "queue.json");
const PUBLISHED = path.join(__dirname, "published.json");
const CANDIDATES = path.join(__dirname, "candidates.json");

const TOKEN = process.env.APIFY_API_TOKEN;
if (!TOKEN) {
  console.error("APIFY_API_TOKEN missing. Add it to agent/.env and re-run.");
  process.exit(1);
}

const watchlist = JSON.parse(fs.readFileSync(WATCHLIST, "utf8"));
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { last_seen: {} };
const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const published = JSON.parse(fs.readFileSync(PUBLISHED, "utf8"));

const seenUrls = new Set([
  ...queue.map((q) => q.ig_url),
  ...published.map((p) => p.ig_url),
]);

const accounts = watchlist.accounts || [];
const perAccount = watchlist.max_posts_per_run || 5;
const maxAgeDays = watchlist.max_age_days || 14;
const oldestAcceptable = Date.now() - maxAgeDays * 86_400_000;

console.log(`Discovering: ${accounts.length} accounts, ${perAccount} posts each.`);
console.log(`Already seen (queue+published): ${seenUrls.size} URLs.`);

const client = new ApifyClient({ token: TOKEN });

// apify/instagram-profile-scraper — official, free-tier friendly. $2.60/1000 results.
const run = await client.actor("apify/instagram-profile-scraper").call({
  usernames: accounts,
  resultsLimit: perAccount,
});

const { items: profiles } = await client.dataset(run.defaultDatasetId).listItems();
console.log(`Apify returned ${profiles.length} profile(s).`);

// Flatten: each profile contains a latestPosts array.
const allPosts = [];
for (const profile of profiles) {
  const username = profile.username;
  const posts = profile.latestPosts || [];
  for (const p of posts) {
    allPosts.push({ ...p, _username: username });
  }
}
console.log(`Flattened to ${allPosts.length} posts across all profiles.`);

const candidates = [];
for (const post of allPosts) {
  const username = post.ownerUsername || post._username;
  if (!username) continue;

  const url = post.url || (post.shortCode && `https://www.instagram.com/p/${post.shortCode}/`);
  if (!url) continue;

  const postedMs = post.timestamp ? new Date(post.timestamp).getTime() : null;
  if (!postedMs || postedMs < oldestAcceptable) continue;

  if (seenUrls.has(url)) continue;

  const lastSeen = state.last_seen[username];
  if (!lastSeen || postedMs > lastSeen) state.last_seen[username] = postedMs;

  candidates.push({
    ig_url: url,
    photographer: `@${username}`,
    posted_at: new Date(postedMs).toISOString().slice(0, 10),
    type: post.type || "Image",
    thumbnail: post.displayUrl || null,
    caption_excerpt: (post.caption || "").slice(0, 240),
    likes: post.likesCount || null,
  });
}

// Sort newest first
candidates.sort((a, b) => (a.posted_at < b.posted_at ? 1 : -1));

fs.writeFileSync(CANDIDATES, JSON.stringify(candidates, null, 2) + "\n");
fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");

console.log(`\nWrote ${candidates.length} candidates → candidates.json`);
console.log(`Run "node curate.js" to review and queue.`);
