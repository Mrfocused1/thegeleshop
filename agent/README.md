# The Gele Shop — Daily Blog Agent

A daily agent that turns curated **Instagram features** (publicly posted Nigerian wedding photography) into **original** editorial blog posts on `thegeleshop.com`.

## What it does, day to day

```
watchlist.json ──▶ discover.js ──▶ candidates.json ──▶ curate.js ──▶ queue.json ──▶ agent.js ──▶ posts/<slug>.html
                   (Apify API)                       (you, ~30s)                  (Anthropic)    blog.html (new card)
```

**Three scripts, three roles:**

1. **`discover.js`** — runs daily, calls Apify Instagram Profile Scraper to fetch the latest posts from every account in `watchlist.json`, dedupes against state/queue/published, writes survivors to `candidates.json`. Cost: ~$0.013/day at default scale.

2. **`curate.js`** — terminal-based interactive review. Walks you through `candidates.json` one post at a time. For each: shows photographer, posted date, like count, caption excerpt, thumbnail URL. You hit `q` to queue, `s` to skip, `t` to add a theme hint and queue, `x` to exit.

3. **`agent.js`** — runs daily after curate, picks the oldest queued URL, drafts an original post via Claude Opus 4.7, generates the post page with IG embed + photographer credit, adds an article card to `blog.html`. Cost: ~$0.30/post.

**Total cost at typical use:** discovery (~$0.40/month) + writing (~$9/month for daily posts) ≈ **$10/month for daily fresh content**.
- **Once a day**, the agent picks the oldest queued URL and:
  1. Calls Claude Opus 4.7 (adaptive thinking, prompt caching on the brand-voice system prompt) to write **original** framing copy — title, tag, intro, body, closing — *without* describing the photo or naming people in it.
  2. Generates `posts/<date>-<slug>.html` containing the official Instagram `<blockquote>` embed with full photographer credit.
  3. Inserts an article card into `blog.html`.
  4. Moves the entry from `queue.json` → `published.json`.

The Instagram image stays on Instagram's servers — we never download, scrape, or copy it. The framing copy is original work.

## What it deliberately does **not** do

- It does not scrape Instagram, fetch images, or call any unauthorised IG API.
- It does not copy or paraphrase the photographer's caption.
- It does not invent names of brides, grooms, designers, photographers, or venues.
- It does not auto-discover posts. Curation is human-driven on purpose — IG's terms ban automated discovery, and "did the photographer want to be featured" is editorial judgement, not an API call.

## One-time setup

```bash
cd /Users/paulbridges/Desktop/zariya/agent
npm install                      # @anthropic-ai/sdk + apify-client + dotenv
cp .env.example .env             # then edit .env to add your two API keys
chmod 600 .env                   # don't let other users on the machine read it
```

`.env` should contain:
```
ANTHROPIC_API_KEY=sk-ant-...
APIFY_API_TOKEN=apify_api_...
```

`.env` is gitignored — it never ships with the repo.

## Daily workflow (~30 seconds of your time)

```bash
node discover.js   # ~10s · pulls today's new IG posts from watchlist
node curate.js     # ~30s · walks through candidates, you q/s/t each
node agent.js      # ~30s · drafts the next queued post, publishes it
```

Or schedule them — `discover.js` and `agent.js` work unattended via launchd
(see `com.thegeleshop.blog-agent.plist`); only `curate.js` needs you.

## Manual queueing (no Apify needed)

If you spot a great post yourself and want to skip discovery:

```bash
node add.js https://www.instagram.com/p/Cxxxxxxxxxxx/ \
  --photographer @bellanaijaweddings \
  --theme "Aso-ebi blue and what it says about a Yoruba wedding"
```

The agent processes one queued entry per run (oldest first). Run multiple times to bulk-publish.

## Editing the watchlist

Open `watchlist.json` and add/remove handles. `max_posts_per_run` controls cost; `max_age_days` filters out posts older than N days.

## Running it

```bash
# One-off (manual)
ANTHROPIC_API_KEY="sk-ant-..." node agent.js

# As a daily 09:00 cron job (macOS launchd):
cp com.thegeleshop.blog-agent.plist ~/Library/LaunchAgents/
# IMPORTANT: edit the plist first to put your real API key in EnvironmentVariables
launchctl load ~/Library/LaunchAgents/com.thegeleshop.blog-agent.plist

# Run once on demand:
launchctl start com.thegeleshop.blog-agent

# Stop & remove:
launchctl unload ~/Library/LaunchAgents/com.thegeleshop.blog-agent.plist
```

Logs are written to `agent.log` / `agent.error.log` next to this README.

## Reviewing before going live

The agent writes directly to `blog.html` and `posts/`. If you'd rather review each post before it's public, two easy options:

1. **Drafts folder.** Change the `POSTS_DIR` constant at the top of `agent.js` to `posts/_drafts`, then move the file to `posts/` when you've approved it (and re-run the card-injection part by hand).
2. **Git-gated.** Commit `blog.html` + `posts/` to a branch, run the agent against the working copy, review the diff, then merge.

## Editorial guardrails baked into the prompt

- Brand voice: warm, reverent, editorial; British spelling; gele-literate.
- No invented names — bride/groom/designer/photographer/venue/city all stay archetypal unless a public, attributed handle is supplied.
- No literal description of the photograph — the embed shows the image; the prose adds context.
- Returns strict JSON via `output_config.format` so the page generator never has to parse free text.

If the brand voice drifts, edit the `SYSTEM` constant in `agent.js`.

## File layout

```
agent/
  agent.js          # the daily runner
  add.js            # CLI to enqueue URLs
  queue.json        # pending IG URLs
  published.json    # already-processed URLs
  package.json
  com.thegeleshop.blog-agent.plist
  README.md
posts/
  YYYY-MM-DD-<slug>.html   # generated post pages (one per day)
blog.html         # gets a new article card per run
```
