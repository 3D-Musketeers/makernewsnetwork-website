# HANDOFF - makernewsnetwork-website

Last updated: 2026-11-05 (session 1, step 8 on branch claude/build-out-3: preview host is a 3dmusketeers.com subdomain, no MNN hosting bought). Written for a reader who has
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
9. Hosting (Grant, 2026-11-05, refined later the same day): makernewsnetwork.com is owned but NO hosting is
   bought for it yet. All testing happens on the existing 3dmusketeers.com cPanel account, on a preview
   subdomain of 3dmusketeers.com (suggested name `mnn.3dmusketeers.com`; Grant may pick another). Because of
   that, step 8 made the code host-agnostic: production is `makernewsnetwork.com` with or without www, and
   EVERY other host is a preview host (cookie gate on, QA widget on, assets uncached, QA feedback endpoint
   open). Nothing in the code or the workflow names the preview host; only `APP_URL` in `api/config.php`
   and the OAuth redirect URIs do, and Grant sets those.
10. Obsidian (Grant, 2026-11-05): keep `notes/` in the repo for now. Vault-ready format kept so they can move later.
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
  repointed at this repo; active on every host except makernewsnetwork.com. Included on every page since step 3.
- `.github/workflows/deploy.yml` FTPS deploy on push to `main`, self-skipping without secrets.
- `favicon.svg` placeholder ring mark. Real logo still a TODO (parked by Grant).
- Added in step 4 (2026-11-05), COMMENTS AND ACCOUNTS, per `newsroom-docs/product/comment-auth-system.md`:
  - `api/lib/bootstrap.php`: config, PDO (MySQL on cPanel or SQLite locally, schema auto-created), JSON
    helpers, DB-backed sessions (cookie `mnn_session`, only the SHA-256 of the token is stored), single-use
    expiring tokens (hashed), windowed rate limits, mail (or a dev log file), user state helpers.
  - `api/auth.php`: email magic link (`request-link`, `verify`), second verification (`second`), `me`, `logout`.
    Signup captures the IP. First verification schedules the second one at a random time 1 to 24 h later.
  - `api/oauth.php`: Google and Discord authorization-code flow (state signed with AUTH_SECRET, provider
    email must be verified, links to an existing email account instead of duplicating). Hidden until the
    client ids are configured (returns 503).
  - `api/comments.php`: list (published for all, plus the author's own pending), post (needs session; new
    accounts -> pending, fully verified -> published; restricted/banned refused), remove (own, or staff).
    Plain text only, 2 to 3000 chars, 1 per 20 s and 20 per hour per user.
  - `api/cron/second-verification.php`: sends the second link when due, restricts accounts that ignore it
    for SECOND_GRACE_DAYS, cleans expired tokens and sessions. CLI or HTTP with ?key=CRON_KEY.
  - `assets/mnn-comments.js`: the widget. Signed-out: email link box + Google + Discord buttons. Signed-in:
    post form with counter, pending notice, sign out. Renders with textContent only. Mounted on the review
    template (`#mnn-comments`) and on the new `/sign-in/` page (account state, expired-link messages).
  - `api/config.example.php` grew the DB, APP_URL, AUTH_SECRET, mail, window, OAuth and CRON_KEY settings.
- Added in step 8 (2026-11-05): host-agnostic preview. `.htaccess` gates, un-caches and opens the QA
  endpoint on every host except makernewsnetwork.com; `assets/qa-feedback.js` runs on every host except
  production; `api/qa-feedback.php` allows only its own origin; `tools/verify-live.js` treats any
  non-production base URL as a preview host (the `--qa` flag is gone); the workflow is named generically.
- Added in step 7 (2026-11-05): `assets/og-default.png` (1200x630 text wordmark share image, rendered with
  Playwright from the brand tokens; replace when the logo exists), Open Graph + Twitter card tags and a
  canonical link on every page and both templates, home hero card heading fixed for heading order, QA
  widget colors moved to the brand ember so its text passes contrast.
- Added in step 6 (2026-11-05): `tools/new-page.js` scaffolds a review (`review <category> "Title" "Maker"`)
  or an article (`news|explainer|opinion "Headline"`) from `tools/templates/review.html` and
  `tools/templates/article.html`, fills nav/footer and rebuilds the sitemap. New pages carry [placeholders]
  that must be replaced before they are linked. The article template has the sponsored banner slot, a
  corrections slot at the top, and the comments widget. `privacy/index.html` now lists exactly what the
  account system stores (display name, provider id, timestamps, removed-but-not-erased comments); the
  markdown draft in newsroom-docs is now behind the HTML and should be updated to match.
- Added in step 5 (2026-11-05), MODERATION: `api/moderation.php` (staff only: list held/published/removed
  comments and accounts with search; publish/remove a comment; mark an account verified, restricted, banned
  or new; cannot act on own account; banning kills sessions), `/moderation/` page (tabs, search, actions;
  non-staff see a sign-in notice; excluded from the sitemap), `api/cli/make-staff.php` (CLI only, grants or
  revokes the staff role; staff are also marked fully verified). Also every POST endpoint now requires
  `Content-Type: application/json` (415 otherwise) as defense in depth beside the SameSite=Lax cookie.
- Added in step 3 (2026-11-05): `gate.html` preview gate (cookie `mnn_preview_access`, word "layerline",
  soft gate only), host-aware `.htaccess` (gate and QA feedback endpoint only on qa.*, www to apex 301,
  private files 404, PHP only under /api, no-cache on QA), `assets/qa-feedback.js` included on every page
  (since step 8 it exits only on makernewsnetwork.com), `tools/build-sitemap.js` + generated
  `sitemap.xml` (10 urls), `tools/verify-live.js` (production, a preview base URL, or a local base URL).

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
  are skipped on localhost; run with the preview base URL once the subdomain exists.
- Comments and accounts, end to end under `php -S` with SQLite and a mail log file (window set to 0 h so
  the cron fires at once): me -> null; request-link -> new account, mail logged; verify -> 302 to the next
  path and a session; reusing the link -> 302 to /sign-in/?expired=1; me -> status new, second_pending;
  post -> pending; author sees it, anonymous list is empty; second post within 20 s -> 429; cron -> "sent 1";
  second link -> 302 /sign-in/?second=done, reuse -> second=expired; me -> verified; anonymous list now shows
  the held comment as published; new post -> published at once; remove -> ok; bad slug -> 400; OAuth without
  client id -> 503; cron over HTTP with wrong key -> 500 (config missing CRON_KEY in that run) and right key
  -> ok; 4th sign-in link for one email inside 15 min -> 429; logout -> me null; post signed out -> 401.
  Playwright: review page comments block and /sign-in/ render with 0 console errors.
- Moderation (same local setup): non-staff GET -> 403 "Staff only"; form-encoded POST -> 415; make-staff CLI
  -> "reader@example.com is now staff"; staff list all -> rows with email and user status; remove id 3 and
  publish id 1 -> ok; users search -> row with signup IP and verification timestamps; restrict then verify
  user 2 -> ok; self-ban -> refused; public list shows 1 and 2 published, 3 gone. Playwright: /moderation/
  accounts tab and the staff view of the review comments render with 0 console errors.
- Lighthouse 2026-11-05 (mobile, local static server, after step 7) on home, the review template, /submit/
  and /standards/: performance 100, accessibility 100, best practices 100, SEO 66 on every page. The only
  SEO failure is is-crawlable, caused by the intentional noindex; it clears at launch. Before the fix the
  home page scored accessibility 94 (QA widget button contrast 2.84:1, hero card h3 before any h2).
- Deploy workflow: first run on main (merge of PR 1) completed successfully through the skip path in 10 s.
- Not run: WCAG tooling beyond Lighthouse, .htaccess under real Apache, MySQL (SQLite only),
  a real Google or Discord OAuth round trip (needs client ids and a public callback URL).

## 6. What is left, in order

1. DONE 2026-11-05: PR 1 merged into `main` (merge commit da34623). Later work goes on `claude/*` branches with a PR each.
2. DONE 2026-11-05: gate page, host-aware .htaccess, QA widget on every page, sitemap tool, verify-live.
3. cPanel setup by Grant (section 6a), then add the three FTP secrets and re-run the deploy workflow, then
   `node tools/verify-live.js https://mnn.3dmusketeers.com` must be ALL PASS.
4. `api/qa-feedback-config.php` and `api/config.php` created by Grant on the server (templates in `api/`).
4a. DONE 2026-11-05 (code): comments and accounts. Still needed on the server: a MySQL database and user
   (cPanel > MySQL Databases), the DB_* lines in `api/config.php`, a cron job every 15 minutes running
   `php .../api/cron/second-verification.php`, and Google + Discord OAuth apps with the redirect URIs from
   `api/config.example.php`. Then a real round trip on qa. Moderation view: DONE (step 5). Still to build:
   display-name editing, a staff "lift restriction" email to the reader, and the privacy-policy wording check
   against what is actually stored (email, display name, provider id, signup IP, timestamps, comment text).
5. Real logo (parked; the share image and favicon are placeholders), team bios on /about/, corrections
   wording on /standards/, GA4 measurement id from Grant and the snippet in every page head, open robots.txt
   and remove noindex from every page at launch, then re-run Lighthouse (SEO should reach 100).
6. (Moved to 4a: comments and accounts are built; server setup and moderation view remain.)
7. `api/config.php` on the server, one real test submission, decide whether submissions also go to Flowlu.
8. First real review draft on the template to shake out the data table before buying test equipment.
9. Legal: attorney review of terms and privacy, DMCA designated-agent filing at copyright.gov (Grant files),
   fill every [bracket].
10. Later: model-viewer embed for scanner reviews, download manager for large test files, search, Reddit
    pulse pipeline when Reddit answers the commercial-approval application (submitted 2026-08-02).
11. Add a note to `newsroom-docs/product/tech-stack.md` that the platform changed to static on 2026-11-05.

## 6a. cPanel checklist for Grant (about 20 minutes, on the existing 3dmusketeers.com account; nothing to buy)

1. cPanel > Domains > Create a New Domain: `mnn.3dmusketeers.com` (or the name you prefer), untick "Share
   document root", document root `/home/<cpanel-user>/mnn.3dmusketeers.com`. 3DM's user is `ndmusk5`
   (confirm). Never point it at the 3DM site folder.
2. DNS: 3dmusketeers.com is on Cloudflare, so add a DNS record there for the subdomain (A record to the
   server IP, same as the apex, or a CNAME to the apex). Then cPanel > SSL/TLS Status > Run AutoSSL.
3. cPanel > FTP Accounts: create one account whose directory is exactly that document root and nothing
   above it. Never reuse the 3DM deploy account.
4. GitHub > makernewsnetwork-website > Settings > Secrets and variables > Actions: add `FTP_HOST` (the
   server hostname 3DM already uses), `FTP_USERNAME`, `FTP_PASSWORD`. Then Actions > Deploy > Run workflow.
   Open https://mnn.3dmusketeers.com/ : the preview gate should appear; the word is "layerline".
5. cPanel > MySQL Databases: create database `<user>_mnn` and a user with ALL privileges on it.
6. In cPanel File Manager, inside the preview folder, create `api/config.php` from `api/config.example.php`
   (every define; `APP_URL` = https://mnn.3dmusketeers.com with no trailing slash; a 64-hex `AUTH_SECRET`;
   a `CRON_KEY`) and `api/qa-feedback-config.php` from its example with a fine-grained GitHub PAT that has
   Issues read+write on this repo only. Agents never type tokens; Grant does.
7. cPanel > Cron Jobs: every 15 minutes, command
   `/usr/local/bin/php /home/<user>/mnn.3dmusketeers.com/api/cron/second-verification.php >/dev/null 2>&1`
8. Optional now, needed before launch: Google OAuth client (console.cloud.google.com, Web application,
   redirect URI https://mnn.3dmusketeers.com/api/oauth.php?provider=google) and a Discord application
   (discord.com/developers, OAuth2 redirect https://mnn.3dmusketeers.com/api/oauth.php?provider=discord).
   Paste the ids and secrets into `api/config.php`. Add the makernewsnetwork.com URIs later.
9. After signing in once on the preview host with your email: run on the server
   `php /home/<user>/mnn.3dmusketeers.com/api/cli/make-staff.php you@example.com` (cPanel Terminal or a
   one-off cron). Then /moderation/ works for that account.
10. Tell Claude "preview is up" (and the hostname if it is not mnn.3dmusketeers.com). Claude runs
   `node tools/verify-live.js https://mnn.3dmusketeers.com`, opens the gate page, files one test issue
   through the widget, sends one test submission, and walks one account through both verification emails
   and a comment.

Moving to makernewsnetwork.com later: buy or assign hosting, point the domain at a folder that holds the
same files (or at this very folder), set `APP_URL` and the OAuth URIs to the new domain, add the domain to
the deploy (second FTP target or a second workflow), remove the noindex meta and open robots.txt. The
host-aware rules already treat makernewsnetwork.com as production with no code change.

## 7. Open questions for Grant

1. ANSWERED: a preview subdomain on the 3DM cPanel account, no MNN hosting bought. Confirm the subdomain name (suggested mnn.3dmusketeers.com).
2. ANSWERED: notes stay in the repo for now.
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

Unmerged work, if any, is on a `claude/*` branch with an open pull request; `main` is the merged state.

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
