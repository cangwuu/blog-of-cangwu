/* 拾光记 · 交互脚本（无依赖） */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- 主题切换 ---------- */
  var STORAGE_KEY = 'theme';
  function currentTheme() {
    if (root.dataset.theme === 'dark' || root.dataset.theme === 'light') return root.dataset.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(theme) {
    root.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
  }
  var themeBtn = $('#theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- 移动端菜单 ---------- */
  var menuBtn = $('#menu-toggle');
  var nav = $('#site-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 顶栏阴影 / 阅读进度 / 回到顶部 ---------- */
  var header = $('#site-header');
  var progress = $('#reading-progress');
  var toTop = $('#to-top');
  var post = $('.post-body');

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-stuck', y > 4);
    if (toTop) toTop.classList.toggle('is-visible', y > 520);
    if (progress && post) {
      var start = post.getBoundingClientRect().top + y - 120;
      var total = post.offsetHeight - window.innerHeight + 200;
      var pct = total > 0 ? ((y - start) / total) * 100 : 0;
      progress.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 代码复制 ---------- */
  $$('.code-block').forEach(function (block) {
    var btn = $('.copy-btn', block);
    var code = $('pre code', block);
    if (!btn || !code) return;
    btn.addEventListener('click', function () {
      var text = code.textContent || '';
      var done = function () {
        btn.textContent = '已复制';
        btn.classList.add('is-done');
        setTimeout(function () {
          btn.textContent = '复制';
          btn.classList.remove('is-done');
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });

  /* ---------- 目录高亮 ---------- */
  var tocLinks = $$('.toc a');
  if (tocLinks.length) {
    var map = {};
    tocLinks.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      map[id] = a;
    });
    var headings = $$('.post-body h2[id], .post-body h3[id]');
    var visible = null;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible = entry.target.id;
      });
      var active = null;
      for (var i = headings.length - 1; i >= 0; i--) {
        if (headings[i].getBoundingClientRect().top < 140) { active = headings[i].id; break; }
      }
      if (!active) active = visible;
      tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
      if (active && map[active]) map[active].classList.add('is-active');
    }, { rootMargin: '0px 0px -70% 0px', threshold: 0 });
    headings.forEach(function (h) { obs.observe(h); });
  }

  /* ---------- 搜索 ---------- */
  var modal = $('#search-modal');
  var input = $('#search-input');
  var results = $('#search-results');
  var hint = $('#search-hint');
  var openBtn = $('#search-open');
  var indexPromise = null;
  var focused = -1;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('/search.json').then(function (r) { return r.json(); }).catch(function () { return []; });
    }
    return indexPromise;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function highlight(text, q) {
    var safe = escapeHtml(text);
    if (!q) return safe;
    try {
      return safe.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    } catch (e) { return safe; }
  }

  function openSearch() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    input.value = '';
    results.innerHTML = '';
    hint.textContent = '输入关键词开始搜索，Esc 关闭';
    input.focus();
    loadIndex();
  }
  function closeSearch() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (openBtn) openBtn.focus();
  }

  function renderResults(list, q) {
    focused = -1;
    results.innerHTML = list
      .map(function (p, i) {
        return '<li><a href="' + p.url + '" data-i="' + i + '">' +
          '<span class="r-title">' + highlight(p.title, q) + '</span>' +
          '<span class="r-meta">' + escapeHtml(p.date) + (p.tags && p.tags.length ? ' · ' + escapeHtml(p.tags.join(' / ')) : '') + '</span>' +
          '</a></li>';
      })
      .join('');
    hint.textContent = list.length ? '共 ' + list.length + ' 条结果 · ↑↓ 选择 · Enter 打开' : '没有找到相关文章，换个词试试';
  }

  function runSearch(q) {
    q = q.trim();
    if (!q) { results.innerHTML = ''; hint.textContent = '输入关键词开始搜索，Esc 关闭'; return; }
    loadIndex().then(function (data) {
      var lower = q.toLowerCase();
      var hits = data
        .map(function (p) {
          var hay = (p.title + ' ' + (p.tags || []).join(' ') + ' ' + p.excerpt + ' ' + p.text).toLowerCase();
          var score = 0;
          if (p.title.toLowerCase().indexOf(lower) > -1) score += 10;
          if ((p.tags || []).join(' ').toLowerCase().indexOf(lower) > -1) score += 4;
          if (hay.indexOf(lower) > -1) score += 1;
          return { p: p, score: score };
        })
        .filter(function (x) { return x.score > 0; })
        .sort(function (a, b) { return b.score - a.score || (a.p.date < b.p.date ? 1 : -1); })
        .slice(0, 20)
        .map(function (x) { return x.p; });
      renderResults(hits, q);
    });
  }

  if (openBtn) openBtn.addEventListener('click', openSearch);
  $$('[data-close-search]').forEach(function (el) { el.addEventListener('click', closeSearch); });
  if (input) {
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var v = input.value;
      timer = setTimeout(function () { runSearch(v); }, 90);
    });
    input.addEventListener('keydown', function (e) {
      var links = $$('.search-results a');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!links.length) return;
        focused = (focused + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links.forEach(function (a) { a.classList.remove('is-focused'); });
        links[focused].classList.add('is-focused');
        links[focused].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        var target = links[focused] || links[0];
        if (target) { e.preventDefault(); window.location.href = target.getAttribute('href'); }
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if (e.key === 'Escape' && modal && !modal.hidden) { closeSearch(); return; }
    if (e.key === '/' && !typing && modal && modal.hidden) {
      e.preventDefault();
      openSearch();
    }
  });
})();
