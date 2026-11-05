# Maker News Network - site files

Status: prototype, built 2026-11-05. Not deployed anywhere yet.

This repo is a self-contained static site (plus two small PHP endpoints) for makernewsnetwork.com.
It was started inside the 3dmusketeers-website repo (branch claude/relaxed-maxwell-2sslfs, commits
f79184c and 54ad5e0) and moved here on 2026-11-05.

## What is here

| Path | What |
|---|---|
| `index.html` | Home: positioning, latest reviews, the four rules, news, community |
| `reviews/` | Reviews index with category filter chips (planned launch sequence as sample cards) |
| `reviews/printers/prusa-core-one-plus-indx/` | The review page template: facts, sponsored banner, data table, test files, verdict with per-metric scores, follow-up, where to buy, comments |
| `news/`, `how-we-test/`, `standards/`, `about/`, `submit/` | Section pages, copy drawn from newsroom-docs |
| `terms/`, `privacy/` | Generated from `newsroom-docs/legal/*.md` drafts, ASCII-ized, draft banner on top |
| `assets/mnn.css`, `assets/mnn.js` | Design system (ink/paper/teal/ember, osifont, dark mode toggle, 8px corners, tabular nums) and behaviour |
| `assets/nav.html`, `assets/footer.html` | Shared fragments. After editing: `node tools/inline-includes.js` |
| `assets/qa-feedback.js`, `api/qa-feedback.php` | The staff feedback widget from the 3DM rebuild, repointed at qa.makernewsnetwork.com and a future MNN repo |
| `api/auth.php`, `api/oauth.php`, `api/comments.php`, `api/cron/second-verification.php`, `api/lib/bootstrap.php` | Accounts (email link, Google, Discord), delayed second verification, comments. Needs MySQL + `api/config.php` |
| `assets/mnn-comments.js`, `sign-in/` | Comments widget and the sign-in page |
| `api/moderation.php`, `moderation/`, `api/cli/make-staff.php` | Staff moderation API and page; CLI to grant the staff role |
| `gate.html` | Preview gate for the qa. host |
| `tools/build-sitemap.js`, `tools/verify-live.js` | Sitemap generator and the launch/QA check |
| `tools/new-page.js`, `tools/templates/` | Scaffold a new review or article page |
| `api/submit.php` | Reader submission endpoint (email only, honeypot, throttle, no IP stored). Needs `api/config.php` on the server |
| `tools/check-ascii.js` | House rule: ASCII only. Run before committing |
| `notes/` | Obsidian-ready notes: consolidated brief, lessons from the 3DM site, build log |

Sources: `3D-Musketeers/newsroom-docs` (design, product, legal, testing methodology, editorial SOPs) and the
81 GitHub issues raised against the 3dmusketeers.com rebuild.

## Run locally

```bash
npx serve -l 3000 --no-clipboard .
```

## Not built yet (needs decisions, see notes/MNN - Build Log.md)

- Comments and accounts are built and tested locally with SQLite; MySQL, cron and OAuth apps must be set up on the server (HANDOFF.md section 6a).
- Real review data entry. The template shows the field structure from `product/review-cpt-acf-fields.md`.
- Logo. The favicon is a placeholder ring mark.
- Embedded 3D scan viewer for scanner reviews (model-viewer).
- Analytics, sitemap, robots opened up, OG images.
