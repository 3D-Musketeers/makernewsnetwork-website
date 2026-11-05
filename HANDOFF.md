# HANDOFF - makernewsnetwork-website

Last updated: 2026-11-05 (session 1, step 3 of the static build-out done). Written for a reader who has
seen nothing else. Rule: after every meaningful step, update this file, commit it with the work, push.
Claude never pushes to `main`; it pushes `claude/*` branches and opens a pull request for Grant.

## 1. Goal

The website for Maker News Network (MNN): reviews built on measured data, news that checks its sources,
product recommendations, and a comment section with verified readers. Domain makernewsnetwork.com.
Published by 3D Musketeers, LLC. Platform decided by Grant 2026-11-05: static HTML + PHP, same pattern
as the new 3dmusketeers.com (which left WordPress on 2026-11-01). This supersedes the August 2026
WordPress + Divi 5 decision recorded in `newsroom-docs/product/tech-stack.md`.

## 2. Where everything is

| Thing | Location |
|---|---|
| Site files | this repo root. `SITE-README.md` lists every file and what it does |
| Design, product, legal, editorial and testing docs | repo `3D-Musketeers/newsroom-docs` (private, last commit 2026-08-07) |
| Feedback from the 3DM rebuild | GitHub issues 2 to 82 on `3D-Musketeers/3dmusketeers-website`, distilled in `notes/MNN - Lessons from the 3DM Website.md` |
| Consolidated brief of every MNN decision so far | `notes/MNN - Project Brief (consolidated 2026-11-05).md` |
| Session log and open questions | `notes/MNN - Build Log.md` and section 7 below |
| Obsidian vault | Grant's PC only, not reachable from cloud sessions. `notes/` is written vault-ready (frontmatter, wikilinks) |
| Origin of this code | `3dmusketeers-website` branch `claude/relaxed-maxwell-2sslfs`, commits f79184c (site) and 54ad5e0 (handoff). That folder is being deleted from the 3DM branch now that this repo exists |

## 3. Decisions and why

1. Static HTML + PHP (Grant, 2026-11-05). Faster, accessible, fully controlled, and the 3DM QA/deploy
   pipeline already exists. The comment/auth system is custom code on any platform.
2. Own repo, not newsroom-docs. newsroom-docs is private by design (editorial SOPs stay private; the
   testing methodology goes public later on its own). The site needs its own deploy workflow and its own
   issue tracker for the staff QA widget.
3. Locked identity reused exactly: ink #0d1826, paper #f6f4ef, teal #0a6f83 / #4fc3d9, ember
   #a8431a / #ff8f5c, line #5c6b7a, osifont only, 8px corners, dark mode toggle, tabular numbers.
4. Locked editorial structure reused: data section (measured) then verdict (opinion), one 1 to 10 score
   per metric inside the verdict, no overall score, six-month follow-up, published test files, sponsored
   banner above the fold.
5. Every number on the sample review page is a bracketed placeholder under a visible "sample layout, not
   a review" banner. The launch review (Prusa Core One+ with INDX) touches the real Nozzlegate story and
   nothing invented may look like a measurement.
6. The 3DM QA lessons are code rules here: whole card is the link, no horizontal scrolling lists, AA
   contrast only, one nav binding, phone menu scrolls itself, ASCII-only sources, nav/footer inlined into
   raw HTML, hardened .htaccess, secrets only on the server.
7. Deploy workflow deploys on push to `main` but skips itself until the FTP secrets exist, so merging
   the first PR is safe before hosting is set up.
9. Hosting (Grant, 2026-11-05): makernewsnetwork.com is owned. For now the site is built on the existing
   3DM cPanel account and/or locally. No separate hosting. See the cPanel checklist in section 6a.
10. Obsidian: undecided, Grant will say. `notes/` stays in the repo meanwhile.
11. Logo: parked. The ring-mark favicon stays as the placeholder.
8. Prototype is kept out of search: `<meta name="robots" content="noindex, nofollow">` on every page and
   `robots.txt` disallows all. Remove both at launch.

## 4. What is done

- 11 pages: home, reviews index with wrapping category filters, review page template, news, how we test,
  standards, about, submit (client-side validation works), terms and privacy generated from the legal
  drafts with a draft banner, 404.
- Design system `assets/mnn.css`, behaviour `assets/mnn.js`, fragments `assets/nav.html` and
  `assets/footer.html`, tools `tools/inline-includes.js` and `tools/check-ascii.js`.
- `api/submit.php` reader submissions (email only, honeypot, salted-hash throttle, no IP stored). Needs
  `api/config.php` on the server (template `api/config.example.php`).
- `api/qa-feedback.php` + `assets/qa-feedback.js`: the staff feedback widget from the 3DM rebuild,
  repointed to `qa.makernewsnetwork.com` and this repo. Not yet included on any page.
- `.github/workflows/deploy.yml` FTPS deploy on push to `main`, self-skipping without secrets.
- `favicon.svg` placeholder ring mark. Real logo still a TODO (parked by Grant).
- Added in step 3 (2026-11-05): `gate.html` preview gate (cookie `mnn_preview_access`, word "layerline",
  soft gate only), host-aware `.htaccess` (gate and QA feedback endpoint only on qa.*, www to apex 301,
  private files 404, PHP only under /api, no-cache on QA), `assets/qa-feedback.js` included on every page
  (it exits unless the host is qa.makernewsnetwork.com or localhost), `tools/build-sitemap.js` + generated
  `sitemap.xml` (10 urls), `tools/verify-live.js` (live, --qa, or a local base URL).

## 5. Test results (from the 3DM branch build, same files)

- `node tools/check-ascii.js` -> ASCII clean. `node tools/inline-includes.js` -> 11 pages current.
- Playwright (Chromium) at 1280 light, 1280 dark, 390 phone on home, reviews, review template, standards,
  submit, terms: 0 page errors, 0 console errors. Dark toggle persists in localStorage (`mnn-theme`).
  Phone menu opens and scrolls itself. Submit form rejects a 5-character message client-side.
- `api/submit.php` under `php -S` (PHP 8.3): short message -> 400 "Please add more detail"; honeypot
  filled -> 200 ok silently; bad email -> 400; valid payload -> 502 "Mail failed" (expected, no sendmail
  locally; on cPanel mail() works); GET -> 405; 6 rapid posts -> the 5th and later return 429.
- `node tools/verify-live.js http://localhost:3112`: ALL PASS (sitemap 10 urls, every page 200 with one h1,
  nav+footer pre-filled, title, description, ASCII; assets and robots serve; unknown path 404). Host rules
  are skipped on localhost; run with --qa once qa.makernewsnetwork.com exists.
- Not run: Lighthouse, WCAG tooling, the deploy workflow, .htaccess under real Apache.

## 6. What is left, in order

1. Grant merges the first pull request (`claude/initial-site` into `main`). More commits keep landing on
   that branch until it is merged.
2. DONE 2026-11-05: gate page, host-aware .htaccess, QA widget on every page, sitemap tool, verify-live.
3. cPanel setup by Grant (section 6a), then add the three FTP secrets and re-run the deploy workflow, then
   `node tools/verify-live.js --qa` must be ALL PASS.
4. `api/qa-feedback-config.php` and `api/config.php` created by Grant on the server (templates in `api/`).
5. Real logo (parked), OG image 1200x630, team bios on /about/, corrections wording on /standards/, GA4
   property, open robots.txt and remove noindex from every page at launch.
6. Comment and account system per `newsroom-docs/product/comment-auth-system.md`: Google + Discord OAuth,
   email magic link, signup IP capture, randomized second verification 1 to 24 h later, first comments held
   until it clears, staff badge, moderation. Needs MySQL on cPanel. Privacy policy must be live first.
7. `api/config.php` on the server, one real test submission, decide whether submissions also go to Flowlu.
8. First real review draft on the template to shake out the data table before buying test equipment.
9. Legal: attorney review of terms and privacy, DMCA designated-agent filing at copyright.gov (Grant files),
   fill every [bracket].
10. Later: model-viewer embed for scanner reviews, download manager for large test files, search, Reddit
    pulse pipeline when Reddit answers the commercial-approval application (submitted 2026-08-02).
11. Add a note to `newsroom-docs/product/tech-stack.md` that the platform changed to static on 2026-11-05.

## 6a. cPanel checklist for Grant (about 20 minutes, same account that hosts 3dmusketeers.com)

1. cPanel > Domains > Create a New Domain: `makernewsnetwork.com`, untick "Share document root",
   document root `/home/<cpanel-user>/makernewsnetwork.com`. (3DM's user is `ndmusk5`; confirm.)
2. Same screen again: `qa.makernewsnetwork.com` with document root `/home/<cpanel-user>/qa.makernewsnetwork.com`.
   This is where the deploy workflow uploads. Production can later point at the same folder (3DM's Plan A)
   or at a separate folder with a second deploy target.
3. DNS (wherever makernewsnetwork.com's nameservers are; Cloudflare if it matches 3DM): A records for the
   apex, `www` and `qa` to the server IP, or CNAMEs to the main hostname. Then cPanel > SSL/TLS Status >
   Run AutoSSL so both hosts get certificates.
4. cPanel > FTP Accounts: create one account whose directory is `/home/<cpanel-user>/qa.makernewsnetwork.com`
   and nothing above it. Never reuse the 3DM deploy account: it is scoped to the 3DM folder.
5. GitHub > makernewsnetwork-website > Settings > Secrets and variables > Actions: add `FTP_HOST` (the
   server hostname 3DM already uses), `FTP_USERNAME`, `FTP_PASSWORD`. Then Actions > Deploy > Run workflow.
6. In cPanel File Manager, inside the qa folder, create `api/config.php` from `api/config.example.php`
   (three defines) and `api/qa-feedback-config.php` from its example with a fine-grained GitHub PAT that has
   Issues read+write on this repo only. Agents never type tokens; Grant does.
7. Tell Claude "qa is up". Claude runs `node tools/verify-live.js --qa`, opens the gate page, files one
   test issue through the widget, and sends one test submission.

## 7. Open questions for Grant

1. ANSWERED: hosting on the 3DM cPanel account for now, plus local. DNS details still needed (section 6a step 3).
2. Obsidian: pending, Grant will say.
3. The 3DM cPanel account has a WordPress database `wp470` labeled "3dmreviews". Anything MNN should inherit?
4. Logo: PARKED.
5. Carried over from the docs: Discord login method, download manager, filament blocked metrics now or
   later, who approves sponsorship deals, pulse threshold and sign-off, FibreSeeker Gen 2 vs Gen 3, fate
   of accounts that never finish verification.

## 8. Exact steps to resume on a local PC

```bash
git clone https://github.com/3D-Musketeers/makernewsnetwork-website.git
cd makernewsnetwork-website
```

If the first PR is not merged yet: `git checkout claude/initial-site`.

View the site (Node.js required), then open http://localhost:3000/ :

```bash
npx serve -l 3000 --no-clipboard .
```

Before every commit:

```bash
node tools/inline-includes.js
```

```bash
node tools/check-ascii.js
```

Work on a branch, push it, open a PR into `main`:

```bash
git checkout -b feature/short-name && git add -A && git commit -m "describe the change" && git push -u origin feature/short-name
```

To test `api/submit.php` locally you need PHP 8: copy `api/config.example.php` to `api/config.php`, fill
the three defines, run `php -S localhost:8080 -t .`, open http://localhost:8080/submit/ (mail() needs a
configured sendmail; on cPanel it works out of the box).

House rules carried from 3DM: ASCII only in every source file; no street address or exterior photos
anywhere; secrets never in git and never typed by an agent; run inline-includes after any nav/footer edit.
