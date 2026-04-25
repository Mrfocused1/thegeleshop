# SEO — what's done, what's left for you

## ✅ Done across all five pages (`index`, `learn`, `blog`, `shop`, `contact`)

| Item | Status |
|---|---|
| Unique, keyword-targeted `<title>` tags (under 60 chars where possible) | ✅ |
| `<meta name="description">` (150–160 chars, written to read well as a SERP snippet) | ✅ |
| `<meta name="keywords">` | ✅ (low SEO value but harmless) |
| `<meta name="robots" content="index, follow, max-image-preview:large">` | ✅ |
| Canonical URL (`<link rel="canonical">`) | ✅ |
| Open Graph tags (type, title, description, url, image, site_name, locale) | ✅ |
| Twitter Card tags (`summary_large_image`) | ✅ |
| Favicon (SVG) and Apple touch icon link | ✅ favicon.svg created; you still need `apple-touch-icon.png` |
| `lang="en"` on `<html>` | ✅ |
| `sitemap.xml` | ✅ |
| `robots.txt` (links to sitemap, blocks `/agent/` and dev preview files) | ✅ |
| Image `alt` attributes — every content image now has descriptive alt text | ✅ |

## ✅ JSON-LD structured data (Google reads this — drives rich results)

| Page | Schema |
|---|---|
| `index.html` | `Organization` + `WebSite` graph |
| `learn.html` | `Article` + `BreadcrumbList` |
| `blog.html` | `Blog` + `BreadcrumbList` |
| `shop.html` | `Store` + `ItemList` (5 featured products with prices) + `BreadcrumbList` |
| `contact.html` | `LocalBusiness` (street, hours, phone, email, socials) + `BreadcrumbList` |

`LocalBusiness` schema is the heaviest hitter — it's what gets you into Google Maps and "near me" searches for the Lagos/Ikoyi area. Make sure the address, hours, and phone in `contact.html` match reality before launch.

---

## 🔴 Things you must change before launch

### 1. Replace placeholder domain
Every page uses `https://www.thegele.shop/` as the canonical/OG URL. If your real domain is different, do a project-wide find/replace. From the project root:

```bash
cd /Users/paulbridges/Desktop/zariya
grep -rl "www.thegele.shop" *.html sitemap.xml robots.txt | \
  xargs sed -i '' 's|thegeleshop\.com|YOUR-REAL-DOMAIN.com|g'
```

### 2. Real social handles
The social `sameAs` URLs use `instagram.com/thegeleshop`, etc. Update them to your actual handles in `index.html` and `contact.html`. Same find/replace approach.

### 3. Real contact details
In `contact.html` JSON-LD: `telephone: "+2348012345678"` and `email: "hello@thegele.shop"` are placeholders. Replace with real ones — Google de-ranks businesses whose schema phone/email don't match the page body.

### 4. Apple touch icon
I made `favicon.svg` (a clean black-on-cream "G" wordmark). For iOS home-screen shortcuts you need a 180×180 PNG at `apple-touch-icon.png`. Easiest path:
   - Open `favicon.svg` in any browser, screenshot at 180×180, save as `apple-touch-icon.png`, or
   - Use [realfavicongenerator.net](https://realfavicongenerator.net) — upload `favicon.svg`, download the bundle, drop in `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png`, `site.webmanifest`.

### 5. Submit sitemap to Google
Once you're live on a real domain:
1. Set up [Google Search Console](https://search.google.com/search-console)
2. Verify ownership (DNS TXT record or `<meta>` tag)
3. Submit `https://YOUR-DOMAIN.com/sitemap.xml`
4. Same for [Bing Webmaster Tools](https://www.bing.com/webmasters)

---

## 🟡 Recommended next moves (in priority order)

1. **Real OG images.** The current OG images are the photography on each page (e.g. `hero-home.png` for the homepage), which works — but a properly-designed 1200×630 OG image with the brand wordmark + tagline performs noticeably better on shares. Figma + the brand serif in cream/black + a single gele photo is enough.

2. **Per-product pages.** The shop currently has 5 products inline on `shop.html` with `ItemList` schema — fine for a homepage, but each product should eventually have its own page (`shop/golden-opulence.html`, etc.) with full `Product` schema (name, image, description, sku, brand, offers, aggregateRating). That's where commerce SEO wins are.

3. **Per-blog-post pages.** Same logic. The `blog.html` page lists everything, but each story needs its own URL with full `BlogPosting` schema (headline, datePublished, author, image, mainEntityOfPage). The daily Instagram agent in `agent/` already does this for IG-feature posts — extend the same pattern for any longer-form pieces.

4. **FAQ schema on the Learn page.** Add a "Common Questions" section to `learn.html` (e.g. "What's the difference between aso-oke and brocade?", "How is a gele different from a turban?") and wrap it in `FAQPage` schema. This directly drives "People Also Ask" rich results.

5. **HowTo schema for tutorials.** Any blog post that's a "how to tie [style]" tutorial should use `HowTo` schema with steps + images. Big SERP real estate.

6. **Internal linking.** Right now the homepage links *out* (to learn, blog, shop), but few pages link *to* the learn page contextually. Add inline links from blog posts and shop product copy back to relevant `learn.html` sections (e.g. a shop description that mentions "aso-oke" should link to the Aso-Oke style anchor on Learn).

7. **Page speed.** Currently loading Font Awesome (~70KB) and two Google Font families on every page. If you don't use FA on every page (you don't on `learn.html`), strip it from there. Self-hosting the fonts and inlining critical CSS would shave another ~200ms.

8. **Hreflang.** If you ever localise (Yoruba, French for Francophone West Africa, Spanish), add `<link rel="alternate" hreflang="...">` per page.

9. **Image optimisation.** The hero PNGs are 1–2MB each. Convert to WebP (or AVIF) and serve via `<picture>` with a PNG fallback — typically 70–80% smaller, real Lighthouse score gain.

10. **Schema validator.** After you've made the domain/handle/contact changes, run each page through:
    - [Google Rich Results Test](https://search.google.com/test/rich-results)
    - [Schema.org Validator](https://validator.schema.org)

---

## File-level summary

```
/
├── index.html          ← Org + WebSite JSON-LD, OG, Twitter, canonical
├── learn.html          ← Article + Breadcrumb JSON-LD
├── blog.html           ← Blog + Breadcrumb JSON-LD
├── shop.html           ← Store + ItemList + Breadcrumb JSON-LD
├── contact.html        ← LocalBusiness + Breadcrumb JSON-LD ★ (most valuable)
├── favicon.svg         ← simple cream "G" wordmark
├── sitemap.xml         ← lists all 5 pages
├── robots.txt          ← allows everything except /agent/ and dev previews
└── SEO_NOTES.md        ← this file
```

★ The `LocalBusiness` schema is the single biggest SEO asset on the site. Get the address, hours, phone, and `sameAs` social links right and you'll start showing up for "gele Lagos", "bridal gele Ikoyi", "buy gele near me" searches within ~6–8 weeks of indexing.
