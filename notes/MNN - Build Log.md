---
tags: [mnn, website, build-log]
created: 2026-11-05
---
# MNN - Build Log

## 2026-11-05 - Session 1: research and starter site
Branch: `claude/relaxed-maxwell-2sslfs` in 3dmusketeers-website, folder `makernewsnetwork/`.

Read: all of newsroom-docs (design, product, legal, editorial SOPs, testing methodology, Reddit pipeline), all 81 issues on the 3DM site repo, GO-LIVE-TASKS.md, QA-CONTENT-AUDIT.md, launch runbook, the 3DM shared assets and tooling. Obsidian vault was not reachable from the cloud session (no computer folder attached), so these notes are written here for Grant to drop into the vault.

Built: design system (mnn.css, mnn.js), nav/footer fragments, home, reviews index with filters, review page template, news, how-we-test, standards, about, submit (with working client-side validation), terms and privacy generated from the drafts, 404, favicon placeholder, robots (disallow all), .htaccess, submit.php, QA feedback widget repointed, inline-includes and check-ascii tools, README. Checked in Playwright at 1280 light, 1280 dark, 390 phone: no console errors, dark toggle persists, phone menu works.

Sample data policy: every number on the review template is a bracketed placeholder and the page carries a "sample layout, not a review" banner. Nothing about the real INDX nozzle result is stated.

## Decisions needed from Grant (ranked)
1. Platform. The August decision was WordPress + Divi 5 for easy staff editing. Since then 3DM moved OFF WordPress to static HTML + PHP and the result is faster, accessible, and fully under our control with a proven QA pipeline. Options: (a) static HTML + PHP like 3DM, reviews written as HTML or generated from a simple data file; (b) WordPress + Divi as decided, using this prototype as the design spec; (c) static front end now, WordPress or a headless CMS only if staff editing becomes a real bottleneck. Recommendation: (a), because the comment/auth system is custom code either way and the 3DM pipeline already exists.
2. Repo. Create `3D-Musketeers/makernewsnetwork-website` and move this folder there, or keep building inside 3dmusketeers-website on a branch that never merges.
3. Hosting. Addon domain on the existing Namecheap cPanel account (same server as 3DM), or separate hosting. Is makernewsnetwork.com registered and where is DNS?
4. Obsidian. Attach the vault folder through Remote Control next session so notes save straight into it, or keep the notes folder in the repo.
5. Logo. Ring mark placeholder is in the favicon; commission or draw the real mark.

## Next actions (after answers)
- Static path: gitignore + deploy workflow for a qa.makernewsnetwork.com folder, cookie gate page, verify-live script, GA, sitemap, OG image, then the comment/auth backend (PHP + MySQL on cPanel, Discord/Google OAuth, magic link, delayed second verification cron).
- WordPress path: install WP + Divi 5 + ACF Pro on an addon domain, rebuild these pages as Divi layouts, build the Review CPT per review-cpt-acf-fields.md, then the same custom auth flow as a plugin.
- Either path: first real review draft on the template to shake out the data table shape before buying any test equipment.
