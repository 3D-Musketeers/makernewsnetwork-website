/* ============================================================
   MAKER NEWS NETWORK - comments widget (mnn-comments.js)
   Mount: <div id="mnn-comments" data-slug="/reviews/printers/x/"></div>
   Talks to /api/comments.php and /api/auth.php. Renders with textContent only
   (never innerHTML for user text). Shows: signed-out sign-in box (email link +
   Google + Discord), pending/verified state, the list, the post form.
   ASCII only in this file.
   ============================================================ */
(function () {
  'use strict';
  var root = document.getElementById('mnn-comments');
  if (!root) return;
  // Comments are OFF unless /site-config.json says "comments": true. Pages ship the comment parts hidden.
  var slug = root.getAttribute('data-slug') || (location.pathname.replace(/index\.html$/, ''));
  var countEl = document.querySelector('[data-comment-count]');
  var signinOnly = root.hasAttribute('data-signin-only');
  var state = { user: null, comments: [] };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function api(url, body) {
    return fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Bad response' }; }); });
  }
  function fmtDate(iso) { try { return new Date(iso.replace(' ', 'T')).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return ''; } }
  function badge(kind, label) { var b = el('span', 'badge ' + kind, label); return b; }

  function render() {
    root.textContent = '';
    if (signinOnly) { root.appendChild(state.user ? accountBox() : signInBox()); return; }
    var list = el('div', 'comments');
    if (!state.comments.length) list.appendChild(el('p', 'soft', 'No comments yet. Be the first.'));
    state.comments.forEach(function (c) {
      var box = el('div', 'comment' + (c.status === 'pending' ? ' pending' : ''));
      var head = el('div', 'comment-head');
      head.appendChild(el('span', 'user', c.display_name));
      if (c.staff) head.appendChild(badge('staff', 'Staff'));
      else if (c.status === 'pending') head.appendChild(badge('pending', 'Pending'));
      else head.appendChild(badge('verified', 'Verified'));
      var t = el('time', null, fmtDate(c.created_at)); t.setAttribute('datetime', c.created_at); head.appendChild(t);
      box.appendChild(head);
      var body = el('p', 'comment-body'); body.textContent = c.body; body.style.whiteSpace = 'pre-line'; box.appendChild(body);
      if (c.status === 'pending' && c.mine) box.appendChild(el('p', 'small soft', 'Only you can see this until your second confirmation link is clicked.'));
      if (c.mine || (state.user && state.user.role === 'staff')) {
        var rm = el('button', 'chip', 'Remove'); rm.type = 'button'; rm.style.marginTop = '.5rem';
        rm.addEventListener('click', function () { if (!confirm('Remove this comment?')) return; api('/api/comments.php?action=remove', { id: c.id }).then(load); });
        box.appendChild(rm);
      }
      list.appendChild(box);
    });
    root.appendChild(list);
    root.appendChild(state.user ? postForm() : signInBox());
    if (countEl) countEl.textContent = String(state.comments.filter(function (c) { return c.status === 'published'; }).length);
  }

  function signInBox() {
    var box = el('div', 'comment-form');
    box.appendChild(el('p', null, 'Join the conversation. Sign in with an email link, Google, or Discord. New accounts get a second confirmation email within a day; your first comment appears once you click it.'));
    var form = el('form', 'form'); form.noValidate = true;
    var row = el('div', 'form-row two');
    var f1 = el('div', 'form-row'); var lab = el('label', null, 'Email'); lab.htmlFor = 'mnn-email'; f1.appendChild(lab);
    var inp = el('input'); inp.type = 'email'; inp.id = 'mnn-email'; inp.name = 'email'; inp.autocomplete = 'email'; inp.required = true; inp.setAttribute('inputmode', 'email'); f1.appendChild(inp);
    var f2 = el('div', 'form-row'); f2.appendChild(el('label', null, ' ')); var btn = el('button', 'btn', 'Email me a sign-in link'); btn.type = 'submit'; f2.appendChild(btn);
    row.appendChild(f1); row.appendChild(f2); form.appendChild(row);
    var status = el('p', 'form-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); form.appendChild(status);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!inp.value || inp.validity.typeMismatch) { status.className = 'form-status err'; status.textContent = 'Enter a valid email address.'; inp.focus(); return; }
      status.className = 'form-status'; status.textContent = 'Sending...'; btn.disabled = true;
      api('/api/auth.php?action=request-link', { email: inp.value, next: location.pathname + '#comments' }).then(function (j) {
        btn.disabled = false;
        if (j.ok) { status.className = 'form-status ok'; status.textContent = 'Check your inbox. The link works once and expires in 30 minutes.'; form.reset(); }
        else { status.className = 'form-status err'; status.textContent = j.error || 'Could not send the link.'; }
      });
    });
    box.appendChild(form);
    var social = el('p', null); social.style.marginTop = '.75rem';
    var next = encodeURIComponent(location.pathname + '#comments');
    var g = el('a', 'btn ghost sm', 'Continue with Google'); g.href = '/api/oauth.php?provider=google&next=' + next; g.style.marginRight = '.5rem';
    var d = el('a', 'btn ghost sm', 'Continue with Discord'); d.href = '/api/oauth.php?provider=discord&next=' + next;
    social.appendChild(g); social.appendChild(d); box.appendChild(social);
    var why = el('p', 'small soft'); why.appendChild(document.createTextNode('No anonymous comments, no bots. ')); var a = el('a', null, 'Why we do this'); a.href = '/standards/#community'; why.appendChild(a); why.appendChild(document.createTextNode('.')); box.appendChild(why);
    return box;
  }

  function accountBox() {
    var u = state.user, box = el('div', 'comment-form');
    var head = el('p', null); head.appendChild(document.createTextNode('Signed in as ')); head.appendChild(el('b', null, u.display_name)); head.appendChild(document.createTextNode('. '));
    var out = el('a', null, 'Sign out'); out.href = '#'; out.addEventListener('click', function (e) { e.preventDefault(); api('/api/auth.php?action=logout', {}).then(load); }); head.appendChild(out);
    box.appendChild(head);
    box.appendChild(el('p', 'small soft', u.second_verified ? 'Fully confirmed. Your comments post immediately.' : (u.status === 'restricted' ? 'This account never completed its second confirmation, so it cannot post.' : 'Second confirmation pending: watch your inbox over the next day. Comments are held until then.')));
    var back = el('a', 'btn ghost sm', 'Back to the reviews'); back.href = '/reviews/'; box.appendChild(back);
    return box;
  }

  function postForm() {
    var u = state.user;
    var box = el('div', 'comment-form');
    var head = el('p', null); head.appendChild(document.createTextNode('Commenting as ')); head.appendChild(el('b', null, u.display_name)); head.appendChild(document.createTextNode('. '));
    var out = el('a', null, 'Sign out'); out.href = '#'; out.addEventListener('click', function (e) { e.preventDefault(); api('/api/auth.php?action=logout', {}).then(load); }); head.appendChild(out);
    box.appendChild(head);
    if (u.status === 'restricted') { box.appendChild(el('p', 'field-error', 'This account never completed its second confirmation, so it cannot post. Email legal@makernewsnetwork.com if that is a mistake.')); return box; }
    if (u.second_pending) box.appendChild(el('p', 'small soft', 'Your second confirmation email arrives within a day of signing up. Until you click it, your comments are held and only you can see them.'));
    var form = el('form', 'form'); form.noValidate = true;
    var fr = el('div', 'form-row'); var lab = el('label', null, 'Your comment'); lab.htmlFor = 'mnn-body'; fr.appendChild(lab);
    var ta = el('textarea'); ta.id = 'mnn-body'; ta.maxLength = 3000; ta.required = true; ta.style.minHeight = '120px'; fr.appendChild(ta);
    var counter = el('div', 'counter'); counter.setAttribute('aria-live', 'polite'); fr.appendChild(counter); form.appendChild(fr);
    ta.addEventListener('input', function () { counter.textContent = ta.value.length + ' / 3000'; });
    var btn = el('button', 'btn', 'Post comment'); btn.type = 'submit'; form.appendChild(btn);
    var status = el('p', 'form-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); form.appendChild(status);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (ta.value.trim().length < 2) { status.className = 'form-status err'; status.textContent = 'Say a little more.'; ta.focus(); return; }
      btn.disabled = true; status.className = 'form-status'; status.textContent = 'Posting...';
      api('/api/comments.php', { slug: slug, body: ta.value }).then(function (j) {
        btn.disabled = false;
        if (j.ok) { ta.value = ''; load(); }
        else { status.className = 'form-status err'; status.textContent = j.error || 'Could not post.'; }
      });
    });
    box.appendChild(form);
    return box;
  }

  function load() {
    api('/api/comments.php?slug=' + encodeURIComponent(slug)).then(function (j) {
      if (!j.ok) { root.textContent = ''; root.appendChild(el('p', 'soft', 'Comments are not available right now.')); return; }
      state.user = j.user; state.comments = j.comments; render();
    }).catch(function () { root.textContent = ''; root.appendChild(el('p', 'soft', 'Comments are not available right now.')); });
  }
  fetch('/site-config.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .catch(function () { return {}; })
    .then(function (cfg) {
      if (!cfg || cfg.comments !== true) return;
      document.querySelectorAll('[data-comments-feature]').forEach(function (e) { e.hidden = false; });
      document.querySelectorAll('[data-comments-off]').forEach(function (e) { e.hidden = true; });
      load();
    });
})();
