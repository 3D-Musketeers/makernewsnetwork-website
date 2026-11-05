---
tags: [mnn, website, lessons, qa]
created: 2026-11-05
source: 3dmusketeers-website GitHub issues 2-82 (qa-feedback, audit-gap, pre-launch checklist) and GO-LIVE-TASKS.md
---
# MNN - Lessons from the 3DM Website

81 issues came out of the 3dmusketeers.com rebuild. Grouped into rules for MNN. Issue numbers refer to 3D-Musketeers/3dmusketeers-website.

## Design rules (already applied in the MNN starter)
1. The whole card is the link, not just the blue text (#13, #60, #64, #65). Done: `.card h3 a::after` covers the card.
2. No horizontal scrolling lists or marquees. Chips and tag lists wrap to several lines (#14, #67). Done.
3. Contrast: no light gray on white, no text over busy backgrounds, no dark text on dark orange (#59, #61, #71). Done: every token pairing is AA; no text-over-image hero.
4. Nav: dropdowns must not fall behind the bar (#2), must not fail intermittently from double-bound handlers (#3), must work on phones (#4, #5), and the open phone menu scrolls itself rather than the page (#57). Done: one binding, sticky header with z-index, menu max-height with overflow.
5. Highlight only the nav item whose section contains the current page (#35). Done: aria-current by path prefix.
6. Logo links to the current host, not a hardcoded production URL (#15). Done: href="/".
7. No decorative bar graphs that explain nothing (#12) and no "directional comparison" tables (#24). Rule for MNN: a chart shows measured data or it does not exist.
8. Consistent section headings across pages (#31) and real heading elements, not styled spans (#28).
9. Sticky mobile CTA must not appear on the page it points to (#56). MNN has no sticky CTA yet.
10. Breadcrumb bars under the logo were disliked and removed (#42, #69). MNN: none.

## Form rules (applied on /submit/)
- Validate phone/email properly (#7). Minimum detail length and a live character counter (#8, #10). Scroll to the top of the form, not the middle (#6). Clear success state or thank-you page (#39). Drag-and-drop upload must actually work if offered (#9).

## Content rules
- Do not lose content in a migration: team bios, podcast CTAs, merch, Patreon, testimonials, embedded videos all went missing once (#43 to #55). MNN: write a content inventory before any platform change.
- Ratings and review counts link to their source (#66). Clickable NDA/legal links wherever they are mentioned (#68).
- Avoid self-congratulatory framing like "the honest version" (#73). State the fact, not the virtue.
- Wording of FAQ questions should match how a visitor would ask (#70, #77).
- Searchable FAQ and blog (#22, #26). MNN: reviews index gets filters now, search later.
- Social stats: combined totals first, then per-platform (#18); show the most recent items, and six not four (#17, #81).
- Standalone privacy policy (#38), analytics on every page (#37), response-time promise (#41).

## Infra and process rules (from GO-LIVE-TASKS.md)
- ASCII only in every source file; fixed 24 files late in the 3DM project. MNN: `tools/check-ascii.js` from day one.
- Nav and footer inlined into every page's raw HTML plus a runtime refresh; run the include tool after any fragment edit. MNN: `tools/inline-includes.js`.
- Secrets live only on the server, gitignored, never typed by an agent. Config example files in the repo.
- Host-aware .htaccess: QA hostname gated by cookie, dev pages 404 on production, no directory listings, .md and tools denied, PHP only under /api.
- Staging and production must be separate folders, or every push is a production push (open item on 3DM).
- Keep a verify-live script that checks the live host after any cutover (gate off, 301s, 404s, sitemap, robots, GA, caching).
- WCAG 2.1 AA pass before launch; Lighthouse baseline recorded before and after.
- Privacy: no street address, no exterior photos, strip GPS from images.
- A QA feedback widget that files GitHub issues is worth it: it produced the whole list above. Reused for MNN.
