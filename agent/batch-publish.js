#!/usr/bin/env node
// Batch-generate post pages from a specs JSON file. Each spec has the
// editorial framing (title, deck, body) for one article. The script writes
// posts/<slug>.html for each, prepends an article card to blog.html (newest
// first), and updates published.json. No Apify calls — assumes hero images
// are already saved by enrich.js.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SPECS = path.join(__dirname, process.argv[2] || "batch-specs.json");
const PUBLISHED = path.join(__dirname, "published.json");
const BLOG = path.join(ROOT, "blog.html");
const POSTS_DIR = path.join(ROOT, "posts");

const specs = JSON.parse(fs.readFileSync(SPECS, "utf8"));
const published = JSON.parse(fs.readFileSync(PUBLISHED, "utf8"));

const today = new Date().toISOString().slice(0, 10);
const formatDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wordCountFromHtml(html) {
  const text = String(html || "").replace(/<[^>]+>/g, " ");
  return (text.match(/\b\w+\b/g) || []).length;
}

function postPage({ slug, tag, title, deck, body_html, ig_url, photographer, hero_image, credit_line, is_classic }) {
  const tagDisplay = is_classic ? `CLASSIC · ${tag}` : tag;
  const heroSrc = hero_image.startsWith("posts/") ? hero_image.replace(/^posts\//, "") : hero_image;
  // Prefer the 1200x630 OG card if present alongside the hero (created by ensureOgCard below)
  const ogPath = hero_image.replace(/\.(jpg|jpeg|png|webp)$/i, "-og.jpg");
  const ogPathFs = path.join(ROOT, ogPath);
  const ogImage = fs.existsSync(ogPathFs)
    ? `https://www.thegele.shop/${ogPath}`
    : `https://www.thegele.shop/${hero_image}`;
  const wordCount = wordCountFromHtml(body_html);
  const articleSection = (tag || "Weddings").charAt(0).toUpperCase() + (tag || "Weddings").slice(1).toLowerCase();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escHtml(title)} — The Gele Shop</title>
<meta name="description" content="${escHtml(deck)}" />
<meta name="author" content="Adaeze Okonkwo, Editor — The Gele Shop" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="https://www.thegele.shop/posts/${slug}.html" />

<meta property="og:type" content="article" />
<meta property="og:site_name" content="The Gele Shop" />
<meta property="og:title" content="${escHtml(title)}" />
<meta property="og:description" content="${escHtml(deck)}" />
<meta property="og:url" content="https://www.thegele.shop/posts/${slug}.html" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:locale" content="en_GB" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escHtml(title)}" />
<meta name="twitter:description" content="${escHtml(deck)}" />
<meta name="twitter:image" content="${ogImage}" />

<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
<link rel="apple-touch-icon" href="../apple-touch-icon.png" />

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": ${JSON.stringify(title)},
  "description": ${JSON.stringify(deck)},
  "image": "${ogImage}",
  "datePublished": "${today}",
  "dateModified": "${today}",
  "wordCount": ${wordCount},
  "articleSection": "${articleSection}",
  "author": {
    "@type": "Person",
    "name": "Adaeze Okonkwo",
    "jobTitle": "Editor",
    "url": "https://www.thegele.shop/about.html",
    "worksFor": {
      "@type": "Organization",
      "name": "The Gele Shop",
      "url": "https://www.thegele.shop/"
    }
  },
  "publisher": {
    "@type": "Organization",
    "name": "The Gele Shop",
    "logo": { "@type": "ImageObject", "url": "https://www.thegele.shop/favicon.svg" }
  },
  "mainEntityOfPage": "https://www.thegele.shop/posts/${slug}.html",
  "inLanguage": "en-GB",
  "isAccessibleForFree": true
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.thegele.shop/" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.thegele.shop/blog.html" },
    { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(title)}, "item": "https://www.thegele.shop/posts/${slug}.html" }
  ]
}
</script>

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
  <div class="drawer-head">
    <span class="drawer-eyebrow">MENU</span>
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
    <span class="blog-tag${is_classic ? " classic-tag" : ""}">${escHtml(tagDisplay)}</span>
    <h1>${escHtml(title)}</h1>
    <p class="post-deck">${escHtml(deck)}</p>
    <p class="post-meta">By <a href="/about.html" rel="author">Adaeze Okonkwo, Editor</a> · ${formatDate(new Date())}</p>
  </div>

  <figure class="post-hero">
    <img src="${escHtml(heroSrc)}" alt="${escHtml(title)} — ${escHtml(deck)}" width="1080" height="1440" fetchpriority="high" decoding="async" />
    <figcaption>Featured on <a href="https://www.instagram.com/${photographer.replace(/^@/, "")}/" target="_blank" rel="noopener">${escHtml(photographer)}</a></figcaption>
  </figure>

  <div class="post-embed">
    <div class="post-embed-frame">
      <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${escHtml(ig_url)}" data-instgrm-version="14" style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%;">
        <a href="${escHtml(ig_url)}" style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank" rel="noopener">View this post on Instagram</a>
      </blockquote>
    </div>
    <button class="caption-toggle" type="button" aria-expanded="false">SHOW CAPTION <span class="chev">▾</span></button>
    <p class="post-credit">${escHtml(credit_line)}</p>
  </div>

  <div class="post-body">
${body_html}
  </div>

  <aside class="post-related" aria-label="Continue reading">
    <p class="post-related-eyebrow">CONTINUE READING</p>
    <p class="post-related-pillar">For the deeper context, read our complete guide — <a href="../learn.html">What Is a Gele?</a> — or browse the <a href="../blog.html">full journal</a>.</p>
  </aside>

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
}

function articleCard(s) {
  const target = s.is_classic ? "archive" : "latest";
  const tagDisplay = s.is_classic ? `CLASSIC · ${s.tag}` : s.tag;
  return `    <article class="article-card">
      <a href="posts/${s.slug}.html" class="article-img"><img src="${s.hero_image}" alt="${escHtml(s.title)}"></a>
      <span class="blog-tag${s.is_classic ? " classic-tag" : ""}">${escHtml(tagDisplay)}</span>
      <h3><a href="posts/${s.slug}.html">${escHtml(s.title)}</a></h3>
      <p>${escHtml(s.deck)}</p>
      <span class="article-meta">${s.tag.charAt(0) + s.tag.slice(1).toLowerCase()} · ${formatDate(new Date())}</span>
    </article>
`;
}

// 0. Generate 1200x630 OG cards from hero images (best-effort; needs ImageMagick)
import { execSync } from "node:child_process";
function ensureOgCard(heroRel) {
  if (!heroRel) return false;
  const src = path.join(ROOT, heroRel);
  if (!fs.existsSync(src)) return false;
  const ogRel = heroRel.replace(/\.(jpg|jpeg|png|webp)$/i, "-og.jpg");
  const ogAbs = path.join(ROOT, ogRel);
  if (fs.existsSync(ogAbs)) return true;
  try {
    execSync(`magick "${src}" -resize 1200x -gravity center -extent 1200x630 -quality 85 "${ogAbs}"`, { stdio: "ignore" });
    console.log(`  ↳ generated ${ogRel}`);
    return true;
  } catch (e) {
    return false; // magick missing or failed — postPage falls back to original hero
  }
}
for (const s of specs) ensureOgCard(s.hero_image);

// 1. Write all post pages
for (const s of specs) {
  const filepath = path.join(POSTS_DIR, `${s.slug}.html`);
  fs.writeFileSync(filepath, postPage(s));
  console.log(`✓ posts/${s.slug}.html`);
}

// 2. Insert article cards into blog.html
let blogHtml = fs.readFileSync(BLOG, "utf8");
const latestSpecs = specs.filter((s) => !s.is_classic);
const classicSpecs = specs.filter((s) => s.is_classic);

if (latestSpecs.length) {
  const latestCards = latestSpecs.map(articleCard).join("\n");
  // Insert just after the <div class="articles-grid"> opening
  const i = blogHtml.indexOf('<div class="articles-grid">');
  if (i === -1) throw new Error('Could not find articles-grid in blog.html');
  const lineEnd = blogHtml.indexOf("\n", i) + 1;
  blogHtml = blogHtml.slice(0, lineEnd) + latestCards + blogHtml.slice(lineEnd);
}
if (classicSpecs.length) {
  const classicCards = classicSpecs.map(articleCard).join("\n");
  const i = blogHtml.indexOf('<div class="archive-grid">');
  if (i === -1) throw new Error('Could not find archive-grid in blog.html');
  const lineEnd = blogHtml.indexOf("\n", i) + 1;
  blogHtml = blogHtml.slice(0, lineEnd) + classicCards + blogHtml.slice(lineEnd);
}

// Auto-update Featured Story hero (collage: 1 main + 3 side)
const allPosts = [...specs, ...published];
const main = allPosts.find((p) => p.is_classic) || allPosts[0];
if (main) {
  // Pick 3 side cards: prefer variety (mix classic + recent), excluding the main
  const others = allPosts.filter((p) => p.slug !== main.slug);
  const side = others.slice(0, 3);

  const tagDisplay = (p) => p.is_classic ? `CLASSIC · ${p.tag}` : p.tag;
  const tagClass = (p) => p.is_classic ? "blog-tag classic-tag" : "blog-tag";

  const sideCards = side.map((p) => `
    <a href="posts/${p.slug}.html" class="side-card">
      <div class="side-card-img"><img src="${p.hero_image}" alt="${escHtml(p.title)}"></div>
      <div class="side-card-text">
        <span class="${tagClass(p)}">${escHtml(tagDisplay(p))}</span>
        <h3>${escHtml(p.title)}</h3>
      </div>
    </a>`).join("\n");

  const heroBlock = `<!-- Featured Story hero -->
<section class="featured-hero" id="featured-hero">
  <a href="posts/${main.slug}.html" class="featured-hero-main">
    <div class="featured-hero-img">
      <img src="${main.hero_image}" alt="${escHtml(main.title)}" />
    </div>
    <div class="featured-hero-text">
      <p class="eyebrow gold-eyebrow">FEATURED STORY</p>
      <span class="${tagClass(main)}">${escHtml(tagDisplay(main))}</span>
      <h1>${escHtml(main.title)}</h1>
      <p class="featured-hero-deck">${escHtml(main.deck || "")}</p>
      <p class="featured-hero-meta">By The Gele Shop · ${formatDate(new Date())} · 7 min read</p>
    </div>
  </a>

  <div class="featured-hero-side">
    <p class="eyebrow gold-eyebrow side-eyebrow">ALSO IN THE JOURNAL</p>
${sideCards}
  </div>
</section>`;
  blogHtml = blogHtml.replace(/<!-- Featured Story hero -->[\s\S]*?<\/section>/, heroBlock);
  console.log(`✓ Featured hero refreshed → main: "${main.title}" + 3 side`);
}

fs.writeFileSync(BLOG, blogHtml);
console.log(`✓ blog.html — added ${latestSpecs.length} latest + ${classicSpecs.length} classic cards`);

// 3. Update published.json
for (const s of specs.slice().reverse()) {
  published.unshift({
    ig_url: s.ig_url,
    photographer: s.photographer,
    theme: s.theme || "",
    added_at: today,
    title: s.title,
    deck: s.deck || "",
    tag: s.tag,
    is_classic: !!s.is_classic,
    slug: s.slug,
    hero_image: s.hero_image,
    published_at: new Date().toISOString(),
  });
}
fs.writeFileSync(PUBLISHED, JSON.stringify(published, null, 2));
console.log(`✓ published.json — now ${published.length} posts`);

// 4. Append new post URLs to sitemap.xml
const SITEMAP = path.join(ROOT, "sitemap.xml");
if (fs.existsSync(SITEMAP)) {
  let sitemap = fs.readFileSync(SITEMAP, "utf8");
  let added = 0;
  const newEntries = [];
  for (const s of specs) {
    const url = `https://www.thegele.shop/posts/${s.slug}.html`;
    if (sitemap.includes(url)) continue;
    newEntries.push(`  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    added++;
  }
  if (added > 0) {
    sitemap = sitemap.replace("</urlset>", newEntries.join("\n") + "\n</urlset>");
    fs.writeFileSync(SITEMAP, sitemap);
    console.log(`✓ sitemap.xml — added ${added} URLs`);
  }
}

console.log(`\nDone. ${specs.length} new posts published.`);
