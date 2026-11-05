/* ===================================================================
   QA Feedback Widget - qa.makernewsnetwork.com ONLY
   Self-contained: injects all CSS + HTML via JS.
   Hostname-gated: exits immediately on production.
   Syncs feedback to GitHub Issues via /api/qa-feedback.php.
   =================================================================== */
(function() {
  'use strict';

  // -- HOSTNAME GATE ----------------------------------------------
  var host = window.location.hostname.toLowerCase();
  var allowed = (host === 'qa.makernewsnetwork.com' ||
                 host === 'localhost' ||
                 host === '127.0.0.1');
  if (!allowed) return;            // production -> nothing happens

  // -- CONSTANTS --------------------------------------------------
  var STORAGE_KEY = 'qa_feedback_items';
  var PREFIX      = 'qafb';        // CSS/ID namespace
  var API_URL     = '/api/qa-feedback.php';

  // -- HELPERS ----------------------------------------------------
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) { return []; }
  }

  function saveItems(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch (e) { /* storage full or unavailable */ }
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function getBrowserInfo() {
    var ua = navigator.userAgent;
    var w = window.innerWidth;
    var h = window.innerHeight;
    return ua + ' | Viewport: ' + w + 'x' + h;
  }

  // -- GITHUB SYNC ------------------------------------------------
  function syncToGitHub(item, callback) {
    var payload = JSON.stringify({
      url:         item.url,
      category:    item.category,
      priority:    item.priority,
      description: item.description,
      timestamp:   item.timestamp,
      browser:     item.browser || getBrowserInfo()
    });

    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 20000;

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (res.ok) {
            callback(null, res);
          } else {
            callback(res.error || 'API error');
          }
        } catch (e) {
          callback('Invalid response');
        }
      } else {
        callback('HTTP ' + xhr.status);
      }
    };

    xhr.onerror = function() { callback('Network error'); };
    xhr.ontimeout = function() { callback('Request timed out'); };

    xhr.send(payload);
  }

  function markItemSynced(itemId, issueUrl, issueNum) {
    var items = loadItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId) {
        items[i].synced = true;
        items[i].issue_url = issueUrl;
        items[i].issue_num = issueNum;
        break;
      }
    }
    saveItems(items);
  }

  function markItemSyncFailed(itemId) {
    var items = loadItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId) {
        items[i].synced = false;
        break;
      }
    }
    saveItems(items);
  }

  // -- INJECT STYLES ----------------------------------------------
  var css = document.createElement('style');
  css.textContent = [
    '#' + PREFIX + '-btn{',
    '  position:fixed;bottom:24px;right:24px;z-index:999990;',
    '  display:flex;align-items:center;gap:8px;',
    '  background:#e67e22;color:#fff;border:2px solid #d35400;',
    '  padding:10px 18px;border-radius:8px;cursor:pointer;',
    '  font:700 14px "Share Tech Mono",monospace;',
    '  box-shadow:0 4px 16px rgba(0,0,0,.35);',
    '  transition:transform .15s,box-shadow .15s;',
    '  line-height:1;',
    '}',
    '#' + PREFIX + '-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.45);}',
    '#' + PREFIX + '-badge{',
    '  display:inline-flex;align-items:center;justify-content:center;',
    '  min-width:20px;height:20px;padding:0 5px;',
    '  background:#c0392b;color:#fff;border-radius:10px;',
    '  font:700 11px "Share Tech Mono",monospace;',
    '}',
    '#' + PREFIX + '-badge:empty{display:none;}',

    /* overlay backdrop */
    '#' + PREFIX + '-overlay{',
    '  display:none;position:fixed;inset:0;z-index:999991;',
    '  background:rgba(0,0,0,.6);',
    '  justify-content:center;align-items:flex-start;',
    '  padding:40px 16px;overflow-y:auto;',
    '}',
    '#' + PREFIX + '-overlay.open{display:flex;}',

    /* panel */
    '#' + PREFIX + '-panel{',
    '  background:#1a1a2e;color:#e0e0e0;',
    '  border:2px solid #e67e22;border-radius:12px;',
    '  width:100%;max-width:560px;',
    '  font:14px/1.5 "Share Tech Mono",monospace;',
    '  box-shadow:0 8px 32px rgba(0,0,0,.5);',
    '}',

    /* banner */
    '.' + PREFIX + '-banner{',
    '  background:repeating-linear-gradient(135deg,#e67e22,#e67e22 10px,#d35400 10px,#d35400 20px);',
    '  color:#fff;text-align:center;padding:10px 16px;',
    '  font:700 13px "Share Tech Mono",monospace;',
    '  border-radius:10px 10px 0 0;letter-spacing:.5px;',
    '}',

    /* body */
    '.' + PREFIX + '-body{padding:20px 24px;}',

    /* tabs */
    '.' + PREFIX + '-tabs{display:flex;gap:0;margin-bottom:16px;}',
    '.' + PREFIX + '-tab{',
    '  flex:1;padding:8px;text-align:center;cursor:pointer;',
    '  background:#16213e;color:#888;border:1px solid #333;',
    '  font:700 12px "Share Tech Mono",monospace;',
    '  transition:background .15s,color .15s;',
    '}',
    '.' + PREFIX + '-tab:first-child{border-radius:6px 0 0 6px;}',
    '.' + PREFIX + '-tab:last-child{border-radius:0 6px 6px 0;}',
    '.' + PREFIX + '-tab.active{background:#e67e22;color:#fff;border-color:#e67e22;}',

    /* form fields */
    '.' + PREFIX + '-field{margin-bottom:14px;}',
    '.' + PREFIX + '-field label{display:block;margin-bottom:4px;color:#e67e22;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}',
    '.' + PREFIX + '-field input,' +
    '.' + PREFIX + '-field select,' +
    '.' + PREFIX + '-field textarea{',
    '  width:100%;box-sizing:border-box;padding:8px 10px;',
    '  background:#16213e;color:#e0e0e0;border:1px solid #444;border-radius:6px;',
    '  font:14px "Share Tech Mono",monospace;',
    '  outline:none;transition:border-color .15s;',
    '}',
    '.' + PREFIX + '-field input:focus,' +
    '.' + PREFIX + '-field select:focus,' +
    '.' + PREFIX + '-field textarea:focus{border-color:#e67e22;}',
    '.' + PREFIX + '-field textarea{resize:vertical;min-height:90px;}',

    /* buttons */
    '.' + PREFIX + '-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;}',
    '.' + PREFIX + '-btn-primary{',
    '  background:#e67e22;color:#fff;border:none;padding:10px 20px;',
    '  border-radius:6px;cursor:pointer;font:700 13px "Share Tech Mono",monospace;',
    '  transition:background .15s;',
    '}',
    '.' + PREFIX + '-btn-primary:hover{background:#d35400;}',
    '.' + PREFIX + '-btn-primary:disabled{background:#7f8c8d;cursor:not-allowed;}',
    '.' + PREFIX + '-btn-secondary{',
    '  background:transparent;color:#e67e22;border:1px solid #e67e22;',
    '  padding:10px 20px;border-radius:6px;cursor:pointer;',
    '  font:700 13px "Share Tech Mono",monospace;',
    '  transition:background .15s,color .15s;',
    '}',
    '.' + PREFIX + '-btn-secondary:hover{background:#e67e22;color:#fff;}',
    '.' + PREFIX + '-btn-danger{',
    '  background:transparent;color:#c0392b;border:1px solid #c0392b;',
    '  padding:10px 20px;border-radius:6px;cursor:pointer;',
    '  font:700 13px "Share Tech Mono",monospace;',
    '  transition:background .15s,color .15s;',
    '}',
    '.' + PREFIX + '-btn-danger:hover{background:#c0392b;color:#fff;}',

    /* close */
    '.' + PREFIX + '-close{',
    '  position:absolute;top:12px;right:16px;background:none;border:none;',
    '  color:#fff;font-size:22px;cursor:pointer;line-height:1;',
    '  opacity:.8;transition:opacity .15s;',
    '}',
    '.' + PREFIX + '-close:hover{opacity:1;}',

    /* list view */
    '.' + PREFIX + '-list-item{',
    '  background:#16213e;border:1px solid #333;border-radius:8px;',
    '  padding:14px 16px;margin-bottom:10px;position:relative;',
    '}',
    '.' + PREFIX + '-list-item:hover{border-color:#e67e22;}',
    '.' + PREFIX + '-li-url{font-size:11px;color:#888;word-break:break-all;margin-bottom:4px;}',
    '.' + PREFIX + '-li-desc{margin-bottom:6px;}',
    '.' + PREFIX + '-li-meta{font-size:11px;color:#888;display:flex;gap:12px;flex-wrap:wrap;align-items:center;}',
    '.' + PREFIX + '-li-meta span{display:inline-flex;align-items:center;gap:4px;}',
    '.' + PREFIX + '-tag{',
    '  display:inline-block;padding:2px 8px;border-radius:4px;',
    '  font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;',
    '}',
    '.' + PREFIX + '-tag-bug{background:#c0392b33;color:#e74c3c;}',
    '.' + PREFIX + '-tag-content{background:#2980b933;color:#3498db;}',
    '.' + PREFIX + '-tag-design{background:#8e44ad33;color:#9b59b6;}',
    '.' + PREFIX + '-tag-a11y{background:#27ae6033;color:#2ecc71;}',
    '.' + PREFIX + '-tag-other{background:#7f8c8d33;color:#95a5a6;}',
    '.' + PREFIX + '-tag-low{background:#27ae6033;color:#2ecc71;}',
    '.' + PREFIX + '-tag-medium{background:#f39c1233;color:#f1c40f;}',
    '.' + PREFIX + '-tag-high{background:#c0392b33;color:#e74c3c;}',
    '.' + PREFIX + '-li-delete{',
    '  position:absolute;top:10px;right:12px;background:none;border:none;',
    '  color:#666;cursor:pointer;font-size:16px;line-height:1;',
    '}',
    '.' + PREFIX + '-li-delete:hover{color:#c0392b;}',

    /* sync status indicators */
    '.' + PREFIX + '-sync-icon{',
    '  display:inline-block;width:10px;height:10px;border-radius:50%;',
    '  margin-right:4px;vertical-align:middle;',
    '}',
    '.' + PREFIX + '-sync-yes{background:#27ae60;}',
    '.' + PREFIX + '-sync-no{background:#f39c12;}',
    '.' + PREFIX + '-sync-label{font-size:10px;color:#888;}',
    '.' + PREFIX + '-sync-link{font-size:10px;color:#3498db;text-decoration:none;}',
    '.' + PREFIX + '-sync-link:hover{text-decoration:underline;}',
    '.' + PREFIX + '-retry-btn{',
    '  background:none;border:1px solid #f39c12;color:#f39c12;',
    '  font-size:10px;padding:1px 6px;border-radius:4px;cursor:pointer;',
    '  margin-left:4px;font-family:"Share Tech Mono",monospace;',
    '}',
    '.' + PREFIX + '-retry-btn:hover{background:#f39c12;color:#fff;}',

    /* submit status */
    '.' + PREFIX + '-submit-status{',
    '  margin-top:8px;font-size:12px;line-height:1.4;',
    '}',

    /* empty state */
    '.' + PREFIX + '-empty{text-align:center;color:#666;padding:32px 16px;}',

    /* toast */
    '#' + PREFIX + '-toast{',
    '  position:fixed;bottom:80px;right:24px;z-index:999995;',
    '  background:#27ae60;color:#fff;padding:10px 18px;border-radius:8px;',
    '  font:700 13px "Share Tech Mono",monospace;',
    '  box-shadow:0 4px 12px rgba(0,0,0,.3);',
    '  transform:translateY(20px);opacity:0;',
    '  transition:transform .25s,opacity .25s;pointer-events:none;',
    '}',
    '#' + PREFIX + '-toast.show{transform:translateY(0);opacity:1;}',

    /* screenshot hint */
    '.' + PREFIX + '-hint{font-size:11px;color:#888;margin-top:4px;line-height:1.4;}',

    /* responsive */
    /* <=768px matches the site-wide .mobile-cta sticky bar in 3dm.css (nav.html) -
       nudge the QA button + toast up so they clear that bar instead of overlapping it. */
    '@media(max-width:768px){',
    '  #' + PREFIX + '-btn{bottom:84px;right:16px;}',
    '  #' + PREFIX + '-toast{bottom:140px;right:16px;}',
    '}',
    '@media(max-width:480px){',
    '  #' + PREFIX + '-btn{padding:8px 14px;font-size:12px;}',
    '  #' + PREFIX + '-overlay{padding:16px 8px;}',
    '  .' + PREFIX + '-body{padding:16px;}',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  // -- BUILD DOM --------------------------------------------------

  // Floating button
  var btn = document.createElement('button');
  btn.id = PREFIX + '-btn';
  btn.setAttribute('aria-label', 'Open QA Feedback');
  btn.innerHTML = '<span>QA Feedback</span><span id="' + PREFIX + '-badge"></span>';
  document.body.appendChild(btn);

  // Toast
  var toast = document.createElement('div');
  toast.id = PREFIX + '-toast';
  document.body.appendChild(toast);

  // Overlay
  var overlay = document.createElement('div');
  overlay.id = PREFIX + '-overlay';
  overlay.innerHTML = [
    '<div id="' + PREFIX + '-panel" style="position:relative;">',
    '  <div class="' + PREFIX + '-banner">',
    '    &#9888; QA FEEDBACK ONLY &mdash; This widget will not appear on the live site',
    '  </div>',
    '  <button class="' + PREFIX + '-close" title="Close">&times;</button>',
    '  <div class="' + PREFIX + '-body">',
    '    <div class="' + PREFIX + '-tabs">',
    '      <div class="' + PREFIX + '-tab active" data-tab="form">Submit</div>',
    '      <div class="' + PREFIX + '-tab" data-tab="list">View All</div>',
    '    </div>',
    '    <div id="' + PREFIX + '-form-view"></div>',
    '    <div id="' + PREFIX + '-list-view" style="display:none;"></div>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(overlay);

  // References
  var panel     = document.getElementById(PREFIX + '-panel');
  var badge     = document.getElementById(PREFIX + '-badge');
  var formView  = document.getElementById(PREFIX + '-form-view');
  var listView  = document.getElementById(PREFIX + '-list-view');
  var closeBtn  = overlay.querySelector('.' + PREFIX + '-close');
  var tabs      = overlay.querySelectorAll('.' + PREFIX + '-tab');

  // -- FORM VIEW --------------------------------------------------
  function renderForm() {
    formView.innerHTML = [
      '<div class="' + PREFIX + '-field">',
      '  <label>Page URL</label>',
      '  <input type="text" id="' + PREFIX + '-url" readonly>',
      '</div>',
      '<div class="' + PREFIX + '-field">',
      '  <label>Category</label>',
      '  <select id="' + PREFIX + '-cat">',
      '    <option value="Bug">Bug</option>',
      '    <option value="Content Issue">Content Issue</option>',
      '    <option value="Design">Design</option>',
      '    <option value="Accessibility">Accessibility</option>',
      '    <option value="Other">Other</option>',
      '  </select>',
      '</div>',
      '<div class="' + PREFIX + '-field">',
      '  <label>Priority</label>',
      '  <select id="' + PREFIX + '-pri">',
      '    <option value="Low">Low</option>',
      '    <option value="Medium" selected>Medium</option>',
      '    <option value="High">High</option>',
      '  </select>',
      '</div>',
      '<div class="' + PREFIX + '-field">',
      '  <label>Description</label>',
      '  <textarea id="' + PREFIX + '-desc" placeholder="Describe the issue..."></textarea>',
      '  <div class="' + PREFIX + '-hint">',
      '    Tip: Press <strong>Win+Shift+S</strong> (Windows) or <strong>Cmd+Shift+4</strong> (Mac) to capture a screenshot, then paste the file link in the description.',
      '  </div>',
      '</div>',
      '<div class="' + PREFIX + '-actions">',
      '  <button class="' + PREFIX + '-btn-primary" id="' + PREFIX + '-submit">Submit Feedback</button>',
      '</div>',
      '<div class="' + PREFIX + '-submit-status" id="' + PREFIX + '-submit-status"></div>'
    ].join('\n');
    document.getElementById(PREFIX + '-url').value = window.location.href;
  }

  // -- LIST VIEW --------------------------------------------------
  function catClass(c) {
    var map = { 'Bug': 'bug', 'Content Issue': 'content', 'Design': 'design',
                'Accessibility': 'a11y', 'Other': 'other' };
    return map[c] || 'other';
  }

  function priClass(p) {
    return (p || 'medium').toLowerCase();
  }

  function syncIndicator(it) {
    if (it.synced === true) {
      var linkHtml = it.issue_url
        ? ' <a class="' + PREFIX + '-sync-link" href="' + esc(it.issue_url) + '" target="_blank" rel="noopener">#' + esc(String(it.issue_num || '')) + '</a>'
        : '';
      return '<span><span class="' + PREFIX + '-sync-icon ' + PREFIX + '-sync-yes" title="Synced to GitHub"></span>'
           + '<span class="' + PREFIX + '-sync-label">GitHub</span>' + linkHtml + '</span>';
    }
    return '<span><span class="' + PREFIX + '-sync-icon ' + PREFIX + '-sync-no" title="Local only - not synced"></span>'
         + '<span class="' + PREFIX + '-sync-label">Local only</span>'
         + '<button class="' + PREFIX + '-retry-btn" data-retry="' + esc(it.id) + '">Retry</button></span>';
  }

  function renderList() {
    var items = loadItems();
    if (items.length === 0) {
      listView.innerHTML = '<div class="' + PREFIX + '-empty">No feedback submitted yet.</div>';
      return;
    }

    var html = '';

    // action buttons
    html += '<div class="' + PREFIX + '-actions" style="margin-bottom:16px;">';
    html += '<button class="' + PREFIX + '-btn-secondary" id="' + PREFIX + '-export">Export All (' + items.length + ')</button>';
    html += '<button class="' + PREFIX + '-btn-danger" id="' + PREFIX + '-clear">Clear All</button>';
    html += '</div>';

    // items (newest first)
    var sorted = items.slice().reverse();
    for (var i = 0; i < sorted.length; i++) {
      var it = sorted[i];
      html += '<div class="' + PREFIX + '-list-item" data-id="' + esc(it.id) + '">';
      html += '<button class="' + PREFIX + '-li-delete" title="Delete this item">&times;</button>';
      html += '<div class="' + PREFIX + '-li-url">' + esc(it.url) + '</div>';
      html += '<div class="' + PREFIX + '-li-desc">' + esc(it.description) + '</div>';
      html += '<div class="' + PREFIX + '-li-meta">';
      html += '<span class="' + PREFIX + '-tag ' + PREFIX + '-tag-' + catClass(it.category) + '">' + esc(it.category) + '</span>';
      html += '<span class="' + PREFIX + '-tag ' + PREFIX + '-tag-' + priClass(it.priority) + '">' + esc(it.priority) + '</span>';
      html += '<span>' + fmtDate(it.timestamp) + '</span>';
      html += syncIndicator(it);
      html += '</div>';
      html += '</div>';
    }

    listView.innerHTML = html;
  }

  // -- EXPORT FORMAT ----------------------------------------------
  function buildExport() {
    var items = loadItems();
    if (items.length === 0) return '(No QA feedback items)';

    var lines = [];
    lines.push('# QA Feedback - ' + items.length + ' item(s)');
    lines.push('Exported: ' + new Date().toISOString());
    lines.push('Site: qa.makernewsnetwork.com');
    lines.push('');

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      lines.push('---');
      lines.push('');
      lines.push('## ' + (i + 1) + '. [' + it.category + '] ' + it.priority + ' priority');
      lines.push('');
      lines.push('**Page:** ' + it.url);
      lines.push('**Submitted:** ' + fmtDate(it.timestamp));
      if (it.synced && it.issue_url) {
        lines.push('**GitHub Issue:** ' + it.issue_url);
      }
      lines.push('');
      lines.push(it.description);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('Please review and address each item. Items are listed in submission order.');

    return lines.join('\n');
  }

  // -- BADGE ------------------------------------------------------
  function updateBadge() {
    var count = loadItems().length;
    badge.textContent = count > 0 ? count : '';
  }

  // -- TOAST ------------------------------------------------------
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2200);
  }

  // -- EVENT HANDLERS ---------------------------------------------

  // Open / close overlay
  btn.addEventListener('click', function() {
    overlay.classList.add('open');
    renderForm();
    setTab('form');
  });

  closeBtn.addEventListener('click', function() {
    overlay.classList.remove('open');
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      overlay.classList.remove('open');
    }
  });

  // Tabs
  function setTab(name) {
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      if (t.getAttribute('data-tab') === name) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    }
    if (name === 'form') {
      formView.style.display = '';
      listView.style.display = 'none';
    } else {
      formView.style.display = 'none';
      listView.style.display = '';
      renderList();
    }
  }

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function() {
      setTab(this.getAttribute('data-tab'));
    });
  }

  // Submit
  formView.addEventListener('click', function(e) {
    if (e.target && e.target.id === PREFIX + '-submit') {
      var desc = document.getElementById(PREFIX + '-desc').value.trim();
      if (!desc) {
        document.getElementById(PREFIX + '-desc').style.borderColor = '#c0392b';
        document.getElementById(PREFIX + '-desc').focus();
        return;
      }

      var submitBtn = e.target;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      var statusEl = document.getElementById(PREFIX + '-submit-status');

      var item = {
        id:          uid(),
        url:         document.getElementById(PREFIX + '-url').value,
        category:    document.getElementById(PREFIX + '-cat').value,
        priority:    document.getElementById(PREFIX + '-pri').value,
        description: desc,
        timestamp:   Date.now(),
        browser:     getBrowserInfo(),
        status:      'new',
        synced:      false
      };

      // Save to localStorage first (offline fallback)
      var items = loadItems();
      items.push(item);
      saveItems(items);
      updateBadge();

      // Attempt GitHub sync
      statusEl.innerHTML = '<span style="color:#f39c12;">Creating GitHub issue...</span>';

      syncToGitHub(item, function(err, res) {
        if (!err && res) {
          markItemSynced(item.id, res.issue_url, res.issue_num);
          statusEl.innerHTML = '<span style="color:#27ae60;">Saved + GitHub issue <a href="' + esc(res.issue_url)
            + '" target="_blank" rel="noopener" style="color:#3498db;">#' + res.issue_num + '</a> created</span>';
          showToast('Feedback saved + GitHub issue created');
        } else {
          markItemSyncFailed(item.id);
          statusEl.innerHTML = '<span style="color:#f39c12;">Saved locally (GitHub sync failed: ' + esc(String(err)) + ')</span>';
          showToast('Saved locally - GitHub sync failed');
        }

        // Close after a short delay so the user sees the status
        setTimeout(function() {
          overlay.classList.remove('open');
        }, 1800);
      });
    }
  });

  // List view - delegated clicks
  listView.addEventListener('click', function(e) {
    var target = e.target;

    // Export
    if (target.id === PREFIX + '-export') {
      var text = buildExport();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          showToast('Copied to clipboard');
        }, function() {
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
      return;
    }

    // Clear all
    if (target.id === PREFIX + '-clear') {
      if (confirm('Delete ALL feedback items? This cannot be undone.')) {
        saveItems([]);
        updateBadge();
        renderList();
        showToast('All items cleared');
      }
      return;
    }

    // Retry sync for a single item
    if (target.classList.contains(PREFIX + '-retry-btn')) {
      var retryId = target.getAttribute('data-retry');
      var items = loadItems();
      var retryItem = null;
      for (var j = 0; j < items.length; j++) {
        if (items[j].id === retryId) { retryItem = items[j]; break; }
      }
      if (!retryItem) return;

      target.disabled = true;
      target.textContent = '...';

      syncToGitHub(retryItem, function(err, res) {
        if (!err && res) {
          markItemSynced(retryItem.id, res.issue_url, res.issue_num);
          showToast('Synced to GitHub #' + res.issue_num);
        } else {
          showToast('Sync failed: ' + (err || 'unknown error'));
        }
        renderList();
      });
      return;
    }

    // Delete single item
    if (target.classList.contains(PREFIX + '-li-delete')) {
      var li = target.closest('.' + PREFIX + '-list-item');
      if (!li) return;
      var delId = li.getAttribute('data-id');
      var items = loadItems().filter(function(x) { return x.id !== delId; });
      saveItems(items);
      updateBadge();
      renderList();
      showToast('Item deleted');
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Copied to clipboard');
    } catch (e) {
      showToast('Copy failed - select manually');
    }
    document.body.removeChild(ta);
  }

  // -- INIT -------------------------------------------------------
  renderForm();
  updateBadge();
})();
