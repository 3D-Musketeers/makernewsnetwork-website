/*
 * Writes sitemap.xml from every public page (folder/index.html and root .html), skipping
 * internal pages. Run after adding or removing a page:
 *     node tools/build-sitemap.js
 * lastmod comes from the file's git commit date when available, else today.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const BASE = 'https://makernewsnetwork.com';
const skip = new Set(['404.html', 'gate.html', 'moderation/index.html']);
function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (['assets', 'tools', 'notes', 'api', 'node_modules', '.git', '.github'].includes(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html') && !skip.has(path.relative(root, p))) out.push(p);
  }
  return out;
}
function lastmod(file) {
  try { const d = execSync('git log -1 --format=%cs -- "' + file + '"', { cwd: root }).toString().trim(); if (d) return d; } catch (e) {}
  return new Date().toISOString().slice(0, 10);
}
const urls = walk(root, []).map(f => {
  let rel = path.relative(root, f).replace(/\\/g, '/');
  rel = rel.replace(/index\.html$/, '').replace(/\.html$/, '/');
  return { loc: BASE + '/' + rel, mod: lastmod(f) };
}).sort((a, b) => a.loc.localeCompare(b.loc));
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map(u => '  <url><loc>' + u.loc + '</loc><lastmod>' + u.mod + '</lastmod></url>').join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log('sitemap.xml: ' + urls.length + ' urls');
