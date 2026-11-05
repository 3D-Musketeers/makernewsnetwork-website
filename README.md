# makernewsnetwork-website

The website for Maker News Network (makernewsnetwork.com): a static HTML + PHP site, same pattern as
3dmusketeers.com. Published by 3D Musketeers, LLC.

Start with `HANDOFF.md` (full state of the project) and `SITE-README.md` (what each file is).

## Run locally

```bash
npx serve -l 3000 --no-clipboard .
```

## Before every commit

```bash
node tools/inline-includes.js
node tools/check-ascii.js
```

## Deploy

Push to `main` runs `.github/workflows/deploy.yml`, which uploads over FTPS to the QA document root once
the `FTP_HOST`, `FTP_USERNAME` and `FTP_PASSWORD` repository secrets exist. Until then the job prints a
skip notice and uploads nothing. Server-only files (`api/config.php`, `api/qa-feedback-config.php`) are
created by hand on the server and are gitignored.

## Sources

- Design, product, legal, editorial and testing methodology docs: `3D-Musketeers/newsroom-docs` (private)
- Lessons from the 3dmusketeers.com rebuild: `notes/MNN - Lessons from the 3DM Website.md`
