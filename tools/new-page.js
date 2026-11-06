/*
 * Scaffold a new page from tools/templates, then fill nav/footer and rebuild the sitemap.
 *   node tools/new-page.js review printers "Prusa XL" "Prusa Research"
 *   node tools/new-page.js review scanners "Creality Raptor" "Creality"
 *   node tools/new-page.js review printers "Prusa XL" "Prusa Research" full-review   (type: first-look (default), full-review, follow-up)
 *   node tools/new-page.js news "Bondtech admits the INDX nozzle problem"
 *   node tools/new-page.js explainer "What HRC means for a nozzle"
 *   node tools/new-page.js opinion "Speed is not the spec that matters"
 * Creates reviews/<category>/<slug>/index.html or news/<slug>/index.html and prints the path.
 * Every bracketed [placeholder] in the new file must be replaced before the page is linked anywhere.
 * Categories: printers, filament, scanners, cnc, lasers.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const [kind, ...rest] = process.argv.slice(2);
const cats = { printers: '3D printer', filament: 'Filament', scanners: '3D scanner', cnc: 'CNC', lasers: 'Laser' };
const slugify = s => s.toLowerCase().replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
let file, slug, tpl, vars;
const today = new Date().toISOString().slice(0, 10);
if (kind === 'review') {
  const [cat, title, maker, typeArg] = rest;
  const types = { 'first-look': 'First look', 'full-review': 'Full review', 'follow-up': '6-month follow-up' };
  if (typeArg && !types[typeArg]) { console.error('article type must be first-look, full-review or follow-up'); process.exit(1); }
  if (!cats[cat] || !title) { console.error('usage: node tools/new-page.js review <printers|filament|scanners|cnc|lasers> "Title" "Manufacturer"'); process.exit(1); }
  slug = '/reviews/' + cat + '/' + slugify(title) + '/';
  tpl = 'review.html';
  vars = { TITLE: title, DESCRIPTION: '[One sentence: what we measured and what we found. 120 to 155 characters.]', CATEGORY_LABEL: cats[cat], ARTICLE_TYPE: types[typeArg || 'first-look'], LEDE: '[Two sentences: what the product claims and what the test checks.]', MANUFACTURER: maker || '[manufacturer]', SLUG: slug, DATE: today };
} else if (['news', 'explainer', 'opinion'].includes(kind)) {
  const [title] = rest;
  if (!title) { console.error('usage: node tools/new-page.js ' + kind + ' "Headline"'); process.exit(1); }
  slug = '/news/' + slugify(title) + '/';
  tpl = 'article.html';
  vars = { TITLE: title, DESCRIPTION: '[One sentence summary, 120 to 155 characters.]', KIND_LABEL: kind === 'news' ? 'News' : kind === 'explainer' ? 'Explainer' : 'Opinion', LEDE: '[One or two sentences under the headline.]', SLUG: slug, DATE: today };
} else { console.error('kind must be review, news, explainer or opinion'); process.exit(1); }
file = path.join(root, slug.slice(1), 'index.html');
if (fs.existsSync(file)) { console.error('exists: ' + file); process.exit(1); }
let html = fs.readFileSync(path.join(__dirname, 'templates', tpl), 'utf8');
for (const [k, v] of Object.entries(vars)) html = html.split('{{' + k + '}}').join(v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'));
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, html);
execSync('node tools/inline-includes.js && node tools/build-sitemap.js', { cwd: root, stdio: 'inherit' });
console.log('created ' + path.relative(root, file) + '  (url ' + slug + ')');
console.log('next: replace every [placeholder], remove the sample-data banner on a review, then add a card on the index page');
