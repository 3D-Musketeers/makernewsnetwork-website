---
tags: [mnn, maker-news-network, website, brief]
created: 2026-11-05
sources: [newsroom-docs repo, 3dmusketeers-website issues 2-82, GO-LIVE-TASKS.md]
---
# MNN - Project Brief (consolidated 2026-11-05)

Everything found about Maker News Network across the newsroom-docs repo and the 3DM website work, in one place. See also [[MNN - Lessons from the 3DM Website]] and [[MNN - Build Log]].

## Identity (locked)
- Name: Maker News Network. Domain makernewsnetwork.com. Handles @makernewsnetwork (Instagram, X). Locked 2026-08-03; "Network" won for the umbrella framing (future properties, e.g. the homesteading site).
- Positioning: by makers, for makers. "We test, they market." LTT Labs rigor without the clone; warmer than Tom's Hardware.
- Publisher: 3D Musketeers, LLC directly (2026-08-06, "for now"). Governing law Florida. Legal contact legal@makernewsnetwork.com. No company address on the site.
- Revenue: affiliate links + clearly labeled sponsored content. No display ads, no membership.

## Visual identity (locked 2026-08-02/03)
- Colors: ink #0d1826, paper #f6f4ef, teal #0a6f83 / #4fc3d9, ember #a8431a / #ff8f5c, line #5c6b7a. All pairings WCAG AA.
- Type: osifont only (same font as 3DM, CAD-drawing nod). Hierarchy by size and weight.
- Dark mode toggle mandatory. 8px corners (Grant prefers slightly rounded). tabular-nums in every data table.
- Logo: TODO. Layer-line ring mark is a candidate, not a commitment. Three rounds of concepts exist in newsroom-docs/design.

## Editorial structure (locked)
- Every review: data section (measured only) then verdict section (opinion, labeled). Never blended.
- Per-metric 1 to 10 score lives in the verdict, next to the number. No overall score (marked as a possible future change).
- Initial review + 6-month follow-up for printers, CNC, lasers.
- Publish the real test files (3MF, G-code, LightBurn, scan data). Scanner reviews get an in-page 3D viewer.
- Sponsored: labeled above the fold, no sponsor input, identical protocol.
- Quote and character rule: never cut quotes to change meaning, never attack character. Non-negotiable, public-facing version planned.
- Community pulse: trending threads are leads, not stories. Verification SOP exists. Reddit API commercial approval applied for 2026-08-02; pipeline paused until it answers.

## Testing methodology (five protocols drafted)
Printers (13 metrics incl. nozzle hardness in HRC, added after Nozzlegate), filament (tensile/interlayer blocked on dogbone rig), scanners (VDI/VDE 2634 style: ball bar, 1-2-3 block, billiard balls, color card, transaxle), CNC, lasers. Equipment kit doc exists. No equipment bought, no review published.

## First reviews plan (2026-08-07)
1. Prusa Core One+ with INDX Founders Edition (flagship, nozzle-hardness hook)
2. Core One+ without INDX (paired baseline)
3. FibreSeeker 3 Gen 2 (900 MPa claim vs load cell)
4. Snapmaker U1 or Prusa XL (toolchanger test file)
5. Qidi Plus4, Sovol SV08, MK4S, Flashforge Creator 5, other Core One variants
6. Bambu X1C held (already over-reviewed)

## Product / tech decisions on record
- 2026-08-03: WordPress on the existing Namecheap hosting, Divi 5 (Grant owns the license), ACF Pro, TablePress, Rank Math, ThirstyAffiliates, AAWP, Nextend Social Login, Wordfence, UpdraftPlus. Reason: non-technical staff editing, cost under 150 USD/yr.
- Review post type + ACF field design (2026-08-06): Review info, Data repeater per category with a controlled metric vocabulary, Verdict group with per-metric scores and anecdotal notes.
- Comment/auth scope: no anonymous comments; Google, Discord, email magic link; capture signup IP; second verification 1 to 24 hours after signup; first comments held until it clears; returning members post instantly. Custom code regardless of platform.
- Legal: TOS and privacy drafts exist (attorney review pending, DMCA designated-agent filing not done, retention language is "as long as necessary").

## What changed since those decisions
- 3dmusketeers.com left WordPress for a static HTML + PHP site, live since 2026-11-01. The move was driven by speed, SEO, accessibility and control. The whole QA pipeline (feedback widget to GitHub issues, inline includes, ASCII rule, verify-live, host-aware .htaccess) now exists and is proven.
- That makes the Aug WordPress decision worth re-asking. See [[MNN - Build Log]] for the question as put to Grant.

## Open questions carried forward (from the docs)
- Discord login solution. Download manager for large test files. Category as taxonomy vs field.
- Filament's blocked metrics: list now or add with the rig.
- Who approves sponsorship deals; exact disclosure wording.
- Pulse dashboard engagement threshold; who signs off.
- FibreSeeker Gen 2 now vs wait for Gen 3. Cadence of reviews 1 to 5.
- Account that never completes second verification: restricted forever or deleted later.
- Revenue routing and accountant sign-off if a separate entity is ever revived.
- A WordPress database named "3dmreviews" (wp470) exists on the 3DM hosting account. Unknown whether it holds anything MNN should inherit.
