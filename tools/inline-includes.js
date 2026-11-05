/*
 * Pre-fills every page's <div data-include="nav"></div> and <div data-include="footer"></div>
 * with the markup from assets/nav.html and assets/footer.html, so crawlers see site-wide
 * links without JavaScript and there is no layout shift. Same house rule as 3dmusketeers.com:
 * run this after ANY edit to nav.html or footer.html, then commit the pages it changes.
 *     node tools/inline-includes.js
 * Safe to run repeatedly. Walks every .html under the site root except assets/ and tools/.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const frag = {
  nav: fs.readFileSync(path.join(root, 'assets/nav.html'), 'utf8').trim(),
  footer: fs.readFileSync(path.join(root, 'assets/footer.html'), 'utf8').trim(),
};
const START = '<!--inline-start-->', END = '<!--inline-end-->';
function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (['assets', 'tools', 'notes', 'api', 'node_modules', '.git', '.github'].includes(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}
let changed = 0, same = 0;
for (const file of walk(root, [])) {
  let s = fs.readFileSync(file, 'utf8'), next = s;
  for (const kind of ['nav', 'footer']) {
    const re = new RegExp('<div data-include="' + kind + '">[\\s\\S]*?</div>(?=\\s*(<main|<script|<!--|$))');
    const re2 = new RegExp('<div data-include="' + kind + '">' + START + '[\\s\\S]*?' + END + '</div>');
    const replacement = '<div data-include="' + kind + '">' + START + '\n' + frag[kind] + '\n' + END + '</div>';
    if (re2.test(next)) next = next.replace(re2, replacement);
    else next = next.replace('<div data-include="' + kind + '"></div>', replacement);
  }
  if (next !== s) { fs.writeFileSync(file, next); changed++; } else same++;
}
console.log('pages updated: ' + changed + ' | already current: ' + same);
