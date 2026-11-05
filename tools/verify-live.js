/*
 * One-command site check, same idea as 3dmusketeers.com's verify-live.js.
 *
 *   node tools/verify-live.js                              -> https://makernewsnetwork.com (production rules)
 *   node tools/verify-live.js https://mnn.3dmusketeers.com -> a preview host: sends the preview cookie, expects the gate
 *   node tools/verify-live.js http://localhost:3000        -> local dev server: page checks only, no host rules
 *
 * Prints PASS / FAIL per check, exits 1 on any FAIL. Any base that is not makernewsnetwork.com counts as a
 * preview host. Host-rule checks are skipped for localhost because a static dev server has no .htaccess.
 */
const args = process.argv.slice(2);
const BASE = (args.find(a => a.startsWith('http')) || 'https://makernewsnetwork.com').replace(/\/$/, '');
const local = /localhost|127\.0\.0\.1/.test(BASE);
const qa = !local && !/^https?:\/\/(www\.)?makernewsnetwork\.com$/.test(BASE);
const HEAD = qa ? { Cookie: 'mnn_preview_access=granted' } : {};
let failed = 0;
const rec = (ok, name, detail) => { if (!ok) failed++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  [' + detail + ']' : '')); };
const skip = (name, why) => console.log('skip  ' + name + '  [' + why + ']');
const get = (p, opt) => fetch(p.startsWith('http') ? p : BASE + p, Object.assign({ headers: HEAD, redirect: 'manual' }, opt || {}));

(async () => {
  console.log('Checking ' + BASE + (qa ? '  (preview host)' : local ? '  (local)' : '  (production)') + '\n');

  const smRes = await get('/sitemap.xml');
  const sm = smRes.status === 200 ? await smRes.text() : '';
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  rec(smRes.status === 200 && urls.length >= 10, 'sitemap.xml loads and lists pages', urls.length + ' urls');

  const bad = [];
  for (const u of urls) {
    const p = u.replace('https://makernewsnetwork.com', '');
    let res, html = '';
    try { res = await get(p); html = await res.text(); } catch (e) { bad.push(p + ' fetch error'); continue; }
    const probs = [];
    if (res.status !== 200) probs.push('status ' + res.status);
    if ((html.match(/<h1[\s>]/g) || []).length !== 1) probs.push('h1 count');
    if (!html.includes('data-include="nav"><!--inline-start-->')) probs.push('nav not pre-filled');
    if (!html.includes('data-include="footer"><!--inline-start-->')) probs.push('footer not pre-filled');
    if (!/<meta name="description" content="[^"]{20,}"/.test(html)) probs.push('description');
    if (!/<title>[^<]{5,}<\/title>/.test(html)) probs.push('title');
    if (/[^\x00-\x7F]/.test(html)) probs.push('non-ASCII');
    if (probs.length) bad.push(p + ' -> ' + probs.join(', '));
  }
  rec(bad.length === 0, 'every sitemap page: 200, one h1, nav+footer pre-filled, title, description, ASCII', bad.slice(0, 5).join(' | '));

  for (const a of ['/assets/mnn.css', '/assets/mnn.js', '/assets/fonts/osifont.woff2', '/favicon.svg', '/robots.txt']) {
    const r = await get(a); rec(r.status === 200, a + ' serves', 'status ' + r.status);
  }
  const nf = await get('/this-page-does-not-exist/');
  rec(nf.status === 404, 'unknown path returns 404', 'status ' + nf.status);

  if (local) { skip('host rules (gate, redirects, private-file 404s)', 'localhost has no .htaccess'); }
  else {
    if (qa) {
      const r = await fetch(BASE + '/', { redirect: 'manual' });
      rec(r.status === 302 && /gate\.html/.test(r.headers.get('location') || ''), 'preview host gates visitors without the cookie', 'status ' + r.status);
      const g = await get('/gate.html'); rec(g.status === 200, 'gate.html serves on the preview host', 'status ' + g.status);
    } else {
      const r = await get('/'); rec(r.status === 200, 'home serves directly (no gate)', 'status ' + r.status);
      const g = await get('/gate.html'); rec(g.status === 404, 'gate.html is 404 on production', 'status ' + g.status);
      const q = await get('/api/qa-feedback.php', { method: 'POST' }); rec(q.status === 404, 'QA feedback endpoint is 404 on production', 'status ' + q.status);
      const w = await fetch('https://www.makernewsnetwork.com/', { redirect: 'manual' }).catch(() => null);
      rec(w && w.status === 301, 'www redirects to apex', w ? 'status ' + w.status : 'unreachable');
    }
    for (const p of ['/notes/', '/tools/check-ascii.js', '/HANDOFF.md', '/api/config.example.php', '/.github/workflows/deploy.yml']) {
      const r = await get(p); rec(r.status === 404 || r.status === 403, p + ' is not public', 'status ' + r.status);
    }
    const l = await get('/assets/'); rec(l.status !== 200 || !/Index of/.test(await l.text()), 'no directory listing on /assets/');
  }
  console.log('\n' + (failed ? failed + ' FAILED' : 'ALL PASS'));
  process.exit(failed ? 1 : 0);
})();
