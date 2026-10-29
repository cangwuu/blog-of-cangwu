// HTML 模板：把数据拼成页面
import { escapeHtml as esc } from './md.mjs';

const ICONS = {
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  sun:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  menu:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  github:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.88 1.55 2.3 1.1 2.86.84.09-.66.35-1.1.63-1.36-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.9-1.33 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.71 1.03 1.62 1.03 2.74 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9v2.82c0 .27.18.6.69.49A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/></svg>',
  rss:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 19h.01"/><path d="M5 12a7 7 0 0 1 7 7"/><path d="M5 5a14 14 0 0 1 14 14"/></svg>',
  link:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>',
  arrowUp:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  arrowLeft:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  arrowRight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
};

export const icon = (name) => ICONS[name] || ICONS.link;

export function formatDate(iso, style = 'short') {
  // 直接取字符串里的年月日，避免时区把日期算偏一天
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const [, y, mo, d] = m;
  if (style === 'full') return `${y} 年 ${Number(mo)} 月 ${Number(d)} 日`;
  return `${y}-${mo}-${d}`;
}

function head({ site, title, description, path, type = 'website', extra = '' }) {
  const fullTitle = title ? `${esc(title)} · ${esc(site.title)}` : `${esc(site.title)} · ${esc(site.subtitle)}`;
  const canonical = `${site.url}${path}`;
  const desc = esc(description || site.description);
  const ogImage = `${site.url}/assets/og-cover.svg`;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${fullTitle}</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="${esc((site.keywords || []).join(','))}">
<link rel="canonical" href="${canonical}">
<meta name="generator" content="ink-blog">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(title || site.title)}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f8f7f4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121314" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/feed.xml">
<link rel="stylesheet" href="/assets/style.css">
<script>(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}}catch(e){}})();</script>
${extra}`;
}

function header(site, activePath) {
  const links = site.nav
    .map((item) => {
      const active = item.url === activePath || (item.url !== '/' && activePath.startsWith(item.url));
      return `<a href="${item.url}"${active ? ' class="is-active" aria-current="page"' : ''}>${esc(item.name)}</a>`;
    })
    .join('');
  return `<header class="site-header" id="site-header">
  <div class="container header-inner">
    <a class="brand" href="/">
      <span class="brand-mark" aria-hidden="true"></span>
      <span class="brand-text">${esc(site.title)}</span>
    </a>
    <nav class="site-nav" id="site-nav" aria-label="主导航">${links}</nav>
    <div class="header-actions">
      <button type="button" class="icon-btn" id="search-open" aria-label="搜索文章" title="搜索 (按 / )">${icon('search')}</button>
      <button type="button" class="icon-btn" id="theme-toggle" aria-label="切换主题" title="切换深浅色">
        <span class="when-light">${icon('moon')}</span><span class="when-dark">${icon('sun')}</span>
      </button>
      <button type="button" class="icon-btn menu-btn" id="menu-toggle" aria-label="打开菜单" aria-expanded="false">${icon('menu')}</button>
    </div>
  </div>
</header>`;
}

function footer(site) {
  const year = new Date().getFullYear();
  const since = site.footer?.since;
  const range = since && since !== year ? `${since}–${year}` : `${year}`;
  const icp =
    site.footer?.icp && site.footer.icp.trim()
      ? `<a class="footer-icp" href="${esc(site.footer.icpUrl || 'https://beian.miit.gov.cn/')}" target="_blank" rel="noopener">${esc(site.footer.icp)}</a>`
      : '';
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <p class="footer-line">© ${range} ${esc(site.author?.name || site.title)}</p>
    <p class="footer-line footer-sub">${esc(site.footer?.extra || '')}</p>
    <p class="footer-line footer-sub">本站由 Markdown 生成 · 托管于 Cloudflare Pages ${icp}</p>
  </div>
</footer>
<button type="button" class="to-top" id="to-top" aria-label="回到顶部">${icon('arrowUp')}</button>
<div class="search-modal" id="search-modal" hidden>
  <div class="search-backdrop" data-close-search></div>
  <div class="search-panel" role="dialog" aria-modal="true" aria-label="搜索文章">
    <div class="search-field">
      ${icon('search')}
      <input type="search" id="search-input" placeholder="搜索标题、标签或正文…" autocomplete="off" spellcheck="false">
      <button type="button" class="search-close" data-close-search aria-label="关闭">${icon('close')}</button>
    </div>
    <ul class="search-results" id="search-results"></ul>
    <p class="search-hint" id="search-hint">输入关键词开始搜索，Esc 关闭</p>
  </div>
</div>`;
}

function analytics(site) {
  const token = site.analytics?.cloudflareToken;
  if (!token) return '';
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(
    token
  )}"}'></script>`;
}

export function layout({ site, title, description, path, type, bodyClass, content, headExtra = '' }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
${head({ site, title, description, path, type, extra: headExtra })}
</head>
<body class="${bodyClass || ''}">
<a class="skip-link" href="#main">跳到正文</a>
<div class="reading-progress" id="reading-progress" aria-hidden="true"></div>
${header(site, path)}
<main id="main">
${content}
</main>
${footer(site)}
<script src="/assets/app.js" defer></script>
${analytics(site)}
</body>
</html>`;
}

/* ---------------- 组件 ---------------- */

export function postCard(post) {
  let hue = 0;
  for (const ch of post.title) hue = (hue * 31 + ch.codePointAt(0)) % 360;
  const cover = post.cover
    ? `<a class="card-cover" href="${post.url}" tabindex="-1" aria-hidden="true"><img src="${esc(
        post.cover
      )}" alt="" loading="lazy" decoding="async"></a>`
    : `<a class="card-cover card-cover-ph" href="${post.url}" tabindex="-1" aria-hidden="true" style="--h:${hue}"><span aria-hidden="true">${esc(
        post.title.slice(0, 1)
      )}</span></a>`;
  const tags = post.tags
    .slice(0, 2)
    .map((t) => `<a class="tag tag-sm" href="/tags/${encodeURIComponent(t)}/">${esc(t)}</a>`)
    .join('');
  return `<article class="post-card">
  ${cover}
  <div class="card-body">
    <h2 class="card-title"><a href="${post.url}">${esc(post.title)}</a></h2>
    <p class="card-excerpt">${esc(post.excerpt)}</p>
    <div class="card-meta">
      <time datetime="${post.dateIso}">${formatDate(post.dateIso, 'full')}</time>
      <span class="dot"></span>
      <span>${post.readingTime} 分钟</span>
      ${tags ? `<span class="dot"></span><span class="card-tags">${tags}</span>` : ''}
    </div>
  </div>
</article>`;
}

export function sidebar(site, { tags, recentPosts }) {
  const links = (site.author?.links || [])
    .map(
      (l) =>
        `<a class="social-link" href="${esc(l.url)}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ''} title="${esc(
          l.name
        )}">${icon(l.icon)}<span>${esc(l.name)}</span></a>`
    )
    .join('');
  const tagList = tags
    .slice(0, 18)
    .map((t) => `<a class="tag" href="/tags/${encodeURIComponent(t.name)}/">${esc(t.name)}<em>${t.count}</em></a>`)
    .join('');
  const recent = recentPosts
    .slice(0, 5)
    .map(
      (p) =>
        `<li><a href="${p.url}"><span class="recent-title">${esc(p.title)}</span><time datetime="${p.dateIso}">${formatDate(
          p.dateIso
        )}</time></a></li>`
    )
    .join('');
  return `<aside class="side-col">
  <section class="widget profile-widget">
    <img class="widget-avatar" src="${esc(site.author?.avatar || '/assets/avatar.jpg')}" alt="${esc(
    site.author?.name || ''
  )}" width="72" height="72">
    <h2 class="widget-name">${esc(site.author?.name || '')}</h2>
    <p class="widget-bio">${esc(site.author?.bio || '')}</p>
    <div class="social-links">${links}</div>
  </section>
  <section class="widget">
    <h3 class="widget-title">标签</h3>
    <div class="tag-cloud">${tagList}</div>
  </section>
  <section class="widget">
    <h3 class="widget-title">最近更新</h3>
    <ul class="recent-list">${recent}</ul>
  </section>
</aside>`;
}

export function pagination({ current, total, base }) {
  if (total <= 1) return '';
  const href = (p) => (p === 1 ? '/' : `${base}page/${p}/`);
  const items = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) {
      items.push(
        p === current
          ? `<span class="page-num is-current" aria-current="page">${p}</span>`
          : `<a class="page-num" href="${href(p)}">${p}</a>`
      );
    } else if (items[items.length - 1] !== '<span class="page-gap">…</span>') {
      items.push('<span class="page-gap">…</span>');
    }
  }
  const prev =
    current > 1
      ? `<a class="page-arrow" href="${href(current - 1)}" rel="prev">${icon('arrowLeft')}<span>上一页</span></a>`
      : `<span class="page-arrow is-disabled">${icon('arrowLeft')}<span>上一页</span></span>`;
  const next =
    current < total
      ? `<a class="page-arrow" href="${href(current + 1)}" rel="next"><span>下一页</span>${icon('arrowRight')}</a>`
      : `<span class="page-arrow is-disabled"><span>下一页</span>${icon('arrowRight')}</span>`;
  return `<nav class="pagination" aria-label="分页">${prev}<div class="page-nums">${items.join('')}</div>${next}</nav>`;
}

export function tocList(toc) {
  if (!toc.length) return '';
  const items = toc
    .map((h) => `<li class="toc-item toc-l${h.level}"><a href="#${h.id}">${esc(h.text)}</a></li>`)
    .join('');
  return `<nav class="toc" aria-label="目录"><p class="toc-title">目录</p><ul>${items}</ul></nav>`;
}
