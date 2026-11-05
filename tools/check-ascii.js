/*
 * House rule: every source file is ASCII only (fonts, copy and tooling all behaved better
 * for it on 3dmusketeers.com). Prints file:line:col and the offending character.
 *     node tools/check-ascii.js
 * Exit code 1 if anything non-ASCII is found. Binary assets are skipped.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const textExt = new Set(['.html', '.css', '.js', '.php', '.md', '.txt', '.svg', '.json', '.yml', '.htaccess', '']);
let bad = 0;
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === 'fonts') continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!textExt.has(path.extname(name))) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = /[^\x00-\x7F]/.exec(line);
      if (m) { bad++; console.log(path.relative(root, p) + ':' + (i + 1) + ':' + (m.index + 1) + '  U+' + m[0].codePointAt(0).toString(16).toUpperCase()); }
    });
  }
}
walk(root);
console.log(bad ? bad + ' non-ASCII line(s)' : 'ASCII clean');
process.exit(bad ? 1 : 0);
