/* ============================================================
   MAKER NEWS NETWORK - shared behaviour (mnn.js)
   1. Theme toggle (light/dark) persisted in localStorage; honours the OS
      setting until the visitor picks one. Required by the brand brief.
   2. Mobile nav: one binding, in one place (lesson from 3dmusketeers.com,
      where a duplicate binding made the menu "randomly" fail: issue #3).
   3. aria-current on the nav link whose section contains this page
      (only the nested item highlights: issue #35).
   4. Review filters (chips) on the reviews index.
   5. Form helpers: character counter, min length, honeypot, status line
      (issues #7, #8, #10 on the 3DM quote form).
   ASCII only in this file.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var KEY = 'mnn-theme';

  /* ---------- 1. Theme ---------- */
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function applyTheme(t, persist) {
    root.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0d1826' : '#f6f4ef');
    if (persist) { try { localStorage.setItem(KEY, t); } catch (e) { /* storage blocked */ } }
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      var next = t === 'dark' ? 'light' : 'dark';
      btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
      var label = btn.querySelector('.theme-label');
      if (label) label.textContent = next === 'dark' ? 'Dark' : 'Light';
      btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    });
  }
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') applyTheme(saved, false);
    else applyTheme(currentTheme(), false);
  } catch (e) { applyTheme(currentTheme(), false); }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.theme-toggle');
    if (!btn) return;
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
  });

  /* ---------- 2 + 3. Nav ---------- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (toggle && nav && !toggle.dataset.bound) {
      toggle.dataset.bound = '1';
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('nav-open', open);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
          nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
          document.body.classList.remove('nav-open'); toggle.focus();
        }
      });
    }
    if (nav) {
      var here = location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
      nav.querySelectorAll('a[href]').forEach(function (a) {
        var href = a.getAttribute('href').replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
        if (href === '/' ? here === '/' : here.indexOf(href) === 0) {
          a.setAttribute('aria-current', 'page');
        }
      });
    }
  }

  /* ---------- 4. Review filters ---------- */
  function initFilters() {
    var bar = document.querySelector('[data-filter-bar]');
    if (!bar) return;
    var cards = document.querySelectorAll('[data-category]');
    var count = document.querySelector('[data-filter-count]');
    function apply(cat) {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = cat === 'all' || c.getAttribute('data-category') === cat;
        c.hidden = !ok; if (ok) shown++;
      });
      bar.querySelectorAll('.chip').forEach(function (ch) {
        ch.setAttribute('aria-pressed', ch.getAttribute('data-filter') === cat ? 'true' : 'false');
      });
      if (count) count.textContent = shown + (shown === 1 ? ' review' : ' reviews');
    }
    bar.addEventListener('click', function (e) {
      var ch = e.target.closest('.chip'); if (!ch) return;
      e.preventDefault(); apply(ch.getAttribute('data-filter'));
      if (history.replaceState) history.replaceState(null, '', ch.getAttribute('data-filter') === 'all' ? location.pathname : '#' + ch.getAttribute('data-filter'));
    });
    var fromHash = location.hash.replace('#', '');
    apply(fromHash && bar.querySelector('[data-filter="' + fromHash + '"]') ? fromHash : 'all');
  }

  /* ---------- 5. Forms ---------- */
  function initForms() {
    document.querySelectorAll('textarea[data-counter]').forEach(function (ta) {
      var out = document.getElementById(ta.getAttribute('data-counter'));
      var max = parseInt(ta.getAttribute('maxlength') || '0', 10);
      var min = parseInt(ta.getAttribute('data-min') || '0', 10);
      function upd() {
        var n = ta.value.length;
        out.textContent = (max ? n + ' / ' + max : n) + (min && n < min ? ' (at least ' + min + ')' : '');
      }
      ta.addEventListener('input', upd); upd();
    });
    document.querySelectorAll('form[data-ajax]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = form.querySelector('.form-status');
        var min = form.querySelector('textarea[data-min]');
        if (min && min.value.trim().length < parseInt(min.getAttribute('data-min'), 10)) {
          status.className = 'form-status err';
          status.textContent = 'Please add a little more detail (at least ' + min.getAttribute('data-min') + ' characters).';
          min.focus(); return;
        }
        var hp = form.querySelector('.hp input'); if (hp && hp.value) return;
        status.className = 'form-status'; status.textContent = 'Sending...';
        var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
        fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
          .then(function (j) {
            if (j && j.ok) { status.className = 'form-status ok'; status.textContent = 'Got it. Thank you.'; form.reset(); }
            else throw new Error((j && j.error) || 'send failed');
          })
          .catch(function () {
            status.className = 'form-status err';
            status.textContent = 'Could not send right now. Email tips@makernewsnetwork.com instead.';
          });
      });
    });
  }

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () { initNav(); initFilters(); initForms(); });
})();
