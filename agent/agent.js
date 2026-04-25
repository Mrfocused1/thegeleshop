#!/usr/bin/env node
// Daily agent: pick the next queued Instagram URL, draft an original post via the
// Anthropic API, generate a standalone post page that embeds the IG post with
// full photographer credit, and add an article card to blog.html.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const QUEUE = path.join(__dirname, "queue.json");
const PUBLISHED = path.join(__dirname, "published.json");
const POSTS_DIR = path.join(ROOT, "posts");
const BLOG_FILE = path.join(ROOT, "blog.html");

// ---------- 1. Pick the next queued URL ----------

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

const queue = loadJson(QUEUE);
const published = loadJson(PUBLISHED);
const next = queue.find(
  (e) => e.ig_url && !e.ig_url.includes("PASTE_REAL_POST")
);

if (!next) {
  console.log("Queue is empty (or only contains the placeholder). Nothing to publish.");
  process.exit(0);
}
if (published.some((p) => p.ig_url === next.ig_url)) {
  console.log("Skipping — already published:", next.ig_url);
  // Drop the duplicate from the queue
  saveJson(QUEUE, queue.filter((e) => e !== next));
  process.exit(0);
}

console.log("Drafting post for:", next.ig_url);
console.log("  theme:", next.theme || "(none — model will infer)");
console.log("  photographer:", next.photographer || "(unknown)");

// ---------- 2. Ask Claude for original framing copy ----------

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to your environment and re-run.");
  process.exit(1);
}

const client = new Anthropic();

const SYSTEM = `You are the editorial voice of "The Gele Shop" — an online journal celebrating the beauty of African women in traditional clothing, with a focus on the gele headwrap and Nigerian wedding fashion.

Brand voice:
- Warm, reverent, editorial. Think a calmer, more literary BellaNaija meets Vogue.
- Uses British spelling (colour, honour, jewellery).
- Treats fabric, ceremony and craft as inheritance — language is sensory, not breathless.
- Never sensationalises a real wedding or names the people in a photograph if you don't have their public, attributed name.

Output rules — important:
- Your job is to write ORIGINAL framing copy that sits alongside an Instagram post embed by the credited photographer. You are NOT rewriting their caption. You are writing an editorial standalone piece.
- Do not invent specific real-life facts: do not name the bride, groom, family, designer, photographer (beyond the handle the user provides), city, or venue. Speak in archetypes and craft observations.
- Do not describe the photograph in literal detail. Reference the gele's colour family, fabric type (aso-oke, brocade, velvet, organza), or the broader cultural occasion. The image is in the post; your text adds context, not duplication.
- No claims of exclusivity ("we shot this", "her dress was made by"). You're a journal featuring public work.
- Length: ~600 words of body copy.

Return JSON ONLY, matching this exact shape:
{
  "tag": "ONE OF: HERITAGE | STYLE | WEDDINGS | TUTORIALS | LOOKBOOKS | CULTURE",
  "title": "8–11 word evocative title in title case",
  "deck": "one-sentence subtitle, ~20 words, sets up why this matters",
  "intro_html": "2 short paragraphs of opening prose, ~100 words total, wrapped in <p>...</p>",
  "body_html": "3–5 paragraphs of original commentary on the theme, ~400 words, wrapped in <p>...</p>. Optionally include one <blockquote>...</blockquote> with a one-line cultural observation.",
  "closing_html": "1 paragraph closing reflection, ~80 words, in <p>...</p>",
  "credit_line": "A single sentence that thanks the credited photographer and links the reader back to their Instagram. e.g. 'Photographed by @handle — see the original on Instagram.'"
}`;

const userBrief = `Topic / theme hint from the editor: ${next.theme || "(none — pick the most resonant cultural angle from the embed itself)"}

The Instagram post we're framing: ${next.ig_url}
The photographer / credited account: ${next.photographer || "(unattributed — say 'a photographer working in the West African wedding tradition')"}

Write the JSON response now.`;

const response = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 16000,
  thinking: { type: "adaptive" },
  output_config: {
    effort: "high",
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["tag", "title", "deck", "intro_html", "body_html", "closing_html", "credit_line"],
        properties: {
          tag: { type: "string", enum: ["HERITAGE", "STYLE", "WEDDINGS", "TUTORIALS", "LOOKBOOKS", "CULTURE"] },
          title: { type: "string" },
          deck: { type: "string" },
          intro_html: { type: "string" },
          body_html: { type: "string" },
          closing_html: { type: "string" },
          credit_line: { type: "string" },
        },
      },
    },
  },
  system: [
    // Cache the brand-voice system prompt across daily runs (5-min default;
    // doesn't survive day-to-day, but if we ever batch multiple posts it pays off).
    { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
  ],
  messages: [{ role: "user", content: userBrief }],
});

const textBlock = response.content.find((b) => b.type === "text");
if (!textBlock) {
  console.error("No text block in response. Raw response:", JSON.stringify(response, null, 2));
  process.exit(1);
}
const draft = JSON.parse(textBlock.text);

console.log(`Drafted: "${draft.title}" [${draft.tag}]`);

// ---------- 3. Generate the post page ----------

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70);
}

const slug = `${new Date().toISOString().slice(0, 10)}-${slugify(draft.title)}`;
const postFilename = `${slug}.html`;
const postPath = path.join(POSTS_DIR, postFilename);
const heroImageHint = `${draft.tag.toLowerCase()} cover`;

const postHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(draft.title)} — The Gele Shop</title>
<meta name="description" content="${escapeHtml(draft.deck)}" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="../styles.css" />
</head>
<body>

<div class="announcement">CELEBRATING THE BEAUTY &amp; CRAFT OF AFRICAN ADORNMENT</div>

<header class="header">
  <button class="menu-btn" id="menu-open" aria-label="Open menu"><span></span><span></span><span></span></button>
  <a href="../index.html" class="logo">
    <div class="logo-text">THE GELE SHOP</div>
    <div class="logo-sub">JOURNAL &amp; <span>STORIES</span></div>
  </a>
  <div class="nav-right">
    <button class="icon-btn" aria-label="Search"><i class="fa-solid fa-magnifying-glass"></i></button>
    <a href="../shop.html" class="icon-btn bag" aria-label="Shop"><i class="fa-solid fa-bag-shopping"></i><span class="bag-dot"></span></a>
  </div>
</header>

<div class="drawer-overlay" id="drawer-overlay"></div>
<aside class="drawer" id="drawer" aria-label="Main navigation">
  <div class="drawer-head"><span class="drawer-eyebrow">MENU</span>
    <button class="drawer-close" id="menu-close" aria-label="Close menu"><i class="fa-solid fa-xmark"></i></button>
  </div>
  <nav class="drawer-nav">
    <a href="../index.html" class="drawer-link">Home</a>
    <a href="../learn.html" class="drawer-link">Learn</a>
    <a href="../index.html#styles" class="drawer-link">Styles &amp; Origins</a>
    <a href="../index.html#culture" class="drawer-link">Cultural Significance</a>
    <a href="../blog.html" class="drawer-link active">Blog &amp; Stories</a>
    <a href="../shop.html" class="drawer-link">Shop</a>
    <a href="../contact.html" class="drawer-link">Contact</a>
  </nav>
</aside>

<article class="post-article">
  <div class="post-head">
    <span class="blog-tag">${escapeHtml(draft.tag)}</span>
    <h1>${escapeHtml(draft.title)}</h1>
    <p class="post-deck">${escapeHtml(draft.deck)}</p>
    <p class="post-meta">By The Gele Shop · ${formatDate(new Date())}</p>
  </div>

  <div class="post-embed">
    <div class="post-embed-frame">
      <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${escapeHtml(next.ig_url)}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
        <a href="${escapeHtml(next.ig_url)}" style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank" rel="noopener">View this post on Instagram</a>
      </blockquote>
    </div>
    <button class="caption-toggle" type="button" aria-expanded="false">SHOW CAPTION <span class="chev">▾</span></button>
    <p class="post-credit">${escapeHtml(draft.credit_line)}</p>
  </div>

  <div class="post-body">
    ${draft.intro_html}
    ${draft.body_html}
    ${draft.closing_html}
  </div>

  <p class="post-back"><a href="../blog.html" class="link-arrow"><i class="fa-solid fa-arrow-left"></i> Back to all stories</a></p>
</article>

<script async src="//www.instagram.com/embed.js"></script>
<script src="../menu.js"></script>
<script>
  document.querySelectorAll('.caption-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const embed = btn.closest('.post-embed');
      const expanded = embed.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      btn.firstChild.textContent = expanded ? 'HIDE CAPTION ' : 'SHOW CAPTION ';
    });
  });
</script>
</body>
</html>
`;

fs.writeFileSync(postPath, postHtml);
console.log("Wrote post:", path.relative(ROOT, postPath));

// ---------- 4. Insert an article card into blog.html ----------

const blogHtml = fs.readFileSync(BLOG_FILE, "utf8");

// Blog index uses thumbnail images only — embed.js is loaded only on
// individual post detail pages (which already include it in their template).
let updatedBlog = blogHtml;

// Pick a thumbnail. Priority: locally-saved hero image (from enrich.js) →
// hotlinked IG CDN URL → tag-keyed fallback in repo.
const fallbackByTag = {
  HERITAGE:  "gele-velvet-blue.webp",
  STYLE:     "gele-pink.webp",
  WEDDINGS:  "gele-red.webp",
  TUTORIALS: "gele-pink.webp",
  LOOKBOOKS: "gele-emerald-queen.webp",
  CULTURE:   "gele-golden-opulence.webp",
};
const thumbnail = next.hero_image || next.thumbnail || fallbackByTag[draft.tag] || "gele.webp";
const thumbnailIsRemote = thumbnail.startsWith("http");

const newCard = `    <article class="article-card">
      <a href="posts/${postFilename}" class="article-img"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(draft.title)}"${thumbnailIsRemote ? ' loading="lazy" referrerpolicy="no-referrer"' : ""}></a>
      <span class="blog-tag">${escapeHtml(draft.tag)}</span>
      <h3><a href="posts/${postFilename}">${escapeHtml(draft.title)}</a></h3>
      <p>${escapeHtml(draft.deck)}</p>
      <span class="article-meta">${draft.tag.charAt(0) + draft.tag.slice(1).toLowerCase()} · ${formatDate(new Date())}</span>
    </article>
`;

const gridStart = updatedBlog.indexOf('<div class="articles-grid">');
if (gridStart === -1) {
  console.error("Couldn't find <div class=\"articles-grid\"> in blog.html. Aborting.");
  process.exit(1);
}
const insertAt = updatedBlog.indexOf("\n", gridStart) + 1;
updatedBlog = updatedBlog.slice(0, insertAt) + newCard + updatedBlog.slice(insertAt);

fs.writeFileSync(BLOG_FILE, updatedBlog);
console.log("Inserted article card into blog.html");

// ---------- 5. Move from queue to published ----------

const remainingQueue = queue.filter((e) => e !== next);
saveJson(QUEUE, remainingQueue);

published.unshift({
  ...next,
  title: draft.title,
  tag: draft.tag,
  slug,
  published_at: new Date().toISOString(),
});
saveJson(PUBLISHED, published);
console.log("Done. Queue:", remainingQueue.length, "Published:", published.length);

// ---------- helpers ----------

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function formatDate(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
